import {Observable as O} from 'rxjs'
import * as jsondiffpatch from 'jsondiffpatch'
import rxjsSA from '@cycle/rxjs-adapter'

const g_unanchoredLedger = {}

function fromEvent(diffMap, eventName) {
  return O.create(observer => {
    const handler = e => observer.next(e)
    diffMap.on(eventName, handler)
    return () => diffMap.off(eventName, handler)
  })
}

function diff(previous, current) {
  return jsondiffpatch.diff(previous, current)
}

function patch(diffMap, previousDescriptor, descriptor) {
  const delta = diff(previousDescriptor, descriptor)
  // console.log(`previous`, previousDescriptor)
  // console.log(`current`, descriptor)
  // console.log(`delta`, delta)
  if (delta) {
    const {controls, map, sources, layers} = delta
    if (map) {
      patchMap(diffMap, map, descriptor.map)
    }

    if (sources) {
      patchSources(diffMap, sources, descriptor.sources)
    }
  }

  return descriptor
}

function patchMap(diffMap, mapDelta, mapDescriptor) {
  if (mapDelta.center || mapDelta.zoom) {
    diffMap.easeTo({
      center: mapDescriptor.center,
      zoom: mapDescriptor.zoom
    })
  }

  if (mapDelta.dragPan) {
    //console.log(`dragPan`, mapDescriptor.dragPan)
    if(mapDescriptor.dragPan) {
      //console.log(`enabling drag`)
      diffMap.dragPan.enable()
    } else {
      //console.log(`disabling drag`)
      diffMap.dragPan.disable()
    }
  }
}

function patchSources(diffMap, sourcesDelta, sourcesDescriptor) {
  if (sourcesDelta) {
    for (let key in sourcesDelta) {
      const newData = sourcesDescriptor[key].data
      diffMap.getSource(key).setData(newData)
    }
  }
}

function diffAndPatch(descriptor) {
  if (typeof descriptor === `undefined` || !descriptor) { return undefined }

  const anchorId = descriptor.map.container
  const anchor = document.getElementById(anchorId)

  if (!anchor) {
    g_unanchoredLedger[anchorId] = descriptor
    return O.never()
  } else {
    let diffMap = (<any> anchor).diffMap
    if (!diffMap) {
      const {controls, map, sources, layers} = descriptor
      diffMap = new mapboxgl.Map(descriptor.map)
      return O.create(observer => {
        diffMap.on('load', function () {
          /*** HACK to allow for enable/disable from outset */
          diffMap.dragPan.disable()
          diffMap.dragPan.enable()
          /*** End HACK */

          if (sources) {
            for (let key in sources) {
              if (sources.hasOwnProperty(key)) {
                diffMap.addSource(key, sources[key])
              }
            }
          }

          if (layers) {
            for (let key in layers) {
              if (layers.hasOwnProperty(key)) {
                diffMap.addLayer(layers[key])
              }
            }
          }

          ;(<any> anchor).diffMap = diffMap
          ;(<any> anchor).previousDescriptor = descriptor
          observer.next(descriptor)
          observer.complete()
        })
      })
    } else {
      const previousDescriptor = (<any> anchor).previousDescriptor
      const out = O.of(patch(diffMap, previousDescriptor, descriptor))
      ;(<any> anchor).previousDescriptor = descriptor
      return out
    }
  }
}

function renderRawRootElem$(descriptor$, accessToken) {

  const mutation$ = O.create(observer => {
    const mObserver = new MutationObserver(m => observer.next(m))
    const config = { childList: true, subtree: true };
    mObserver.observe(document, config);
    return () => { mObserver.disconnect(); }
  })

  const fromMutation$ = mutation$
    .switchMap(() => {
      let anchorId
      const buffer = []
      for (anchorId in g_unanchoredLedger) {
        const anchor = document.getElementById(anchorId)
        if (anchor) {
          const cachedDescriptor = g_unanchoredLedger[anchorId]
          delete g_unanchoredLedger[anchorId]
          buffer.push(cachedDescriptor)
        }
      }

      if (buffer.length) {
        return O.from(buffer)
      } else {
        return O.never()
      }
    })

  const patch$ = O.merge(descriptor$, fromMutation$)
    .mergeMap(descriptor => {
      return diffAndPatch(descriptor)
    })
    .publish().refCount()

  return patch$
}

function makeQueryRenderedFilter(diffMap$, event$, runSA) {
  return function queryRenderedFilter(info) {
    return diffMap$.switchMap(diffMap => {
      return event$.map(e => {
        const features = diffMap.queryRenderedFeatures(e.point, info)
        return features
      })
      //.filter(x => x.length)
      .publish().refCount()
    })
  }
}

function makeEventsSelector(diffMap$, runSA) {
  return function events(eventName) {
    if (typeof eventName !== `string`) {
      throw new Error(`MapboxGL driver's events() expects argument to be a ` +
        `string representing the event type to listen for.`)
    }

    const out$ = diffMap$.switchMap(diffMap => {
      return fromEvent(diffMap, eventName)
    })
    .publish().refCount()

    const observable = runSA ? runSA.adapt(out$, rxjsSA.streamSubscribe) : out$
    return {
      observable,
      queryRenderedFilter: makeQueryRenderedFilter(diffMap$, observable, runSA)
    }
  }
}

function makeMapSelector(applied$, runSA) {
  return function select(anchorId) {
    //console.log(`choosing map: ${anchorId}`)
    const diffMap$ = applied$
      .map(() => document.getElementById(anchorId))
      .filter(x => !!x)
      .distinctUntilChanged(
        x => x && (<any> x).diffMap
      )
      .map(x => x.diffMap)
      .publishReplay(1).refCount()

    return {
      observable: runSA ? runSA.adapt(diffMap$, rxjsSA.streamSubscribe) : diffMap$,
      events: makeEventsSelector(diffMap$, runSA)
    }
  }
}

export function makeMapDOMDriver(accessToken) {
  if (!accessToken || (typeof(accessToken) !== 'string' && !(accessToken instanceof String))) throw new Error(`MapDOMDriver requires an access token.`)

  if(!mapboxgl.accessToken) {
    mapboxgl.accessToken = accessToken
  }

  function mapDOMDriver(descriptor$, runSA) {

    let adapted$
    if (runSA) {
      adapted$ = rxjsSA.adapt(descriptor$, runSA.streamSubscribe)
        .publishReplay(1).refCount()
    } else {
      adapted$ = descriptor$
        .publishReplay(1).refCount()
    }

    const  applied$ = renderRawRootElem$(adapted$, accessToken)


    applied$.subscribe()

    return {
      select: makeMapSelector(applied$, runSA)
    }
  }

  ;(<any> mapDOMDriver).streamAdapter = rxjsSA
  return mapDOMDriver
}