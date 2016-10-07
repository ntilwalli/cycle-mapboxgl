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
    const {controls, map, sources, layers, canvas} = delta
    if (controls) {
      patchControls(diffMap, controls, descriptor.controls)
    }

    if (map) {
      patchMap(diffMap, map, descriptor.map)
    }

    if (sources) {
      patchSources(diffMap, sources, descriptor.sources)
    }

    if (layers) {
      patchLayers(diffMap, layers, descriptor.layers)
    }

    if (canvas) {
      patchCanvas(diffMap, canvas, descriptor.canvas)
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

function patchSources(diffMap, delta, descriptor) {
  if (delta) {
    if (Array.isArray(delta)) {
      const len = delta.length
      let vals
      switch (len) {
        case 1: // Add
          vals = delta[0]
          for (let key in vals) {
            if (vals.hasOwnProperty(key)) {
              const data = vals[key]
              diffMap.addSource(key, data)
            }
          }
          break
        case 2: // Modify
          vals = delta[0]
          for (let key in vals) {
            if (vals.hasOwnProperty(key)) {
              diffMap.removeSource(key)
              diffMap.addSource(key, descriptor[key])
            }
          }
          break
        case 3: // Delete
          vals = delta[0]
          for (let key in vals) {
            if (vals.hasOwnProperty(key)) {
              diffMap.removeSource(key)
            }
          }
          break
        default:
          throw new Error("Invalid delta length")
      }
    } else {
      for (let key in delta) {
        const newData = descriptor[key].data
        diffMap.getSource(key).setData(newData)
      }
    }
  }
}

function patchLayers(diffMap, delta, descriptor) {
  if (delta) {
    if (Array.isArray(delta)) {
      const len = delta.length
      let vals
      switch (len) {
        case 1: // Add
          vals = delta[0]
          for (let key in vals) {
            if (vals.hasOwnProperty(key)) {
              const data = vals[key]
              diffMap.addLayer(data)
            }
          }
          break
        case 2: // Modify
          vals = delta[0]
          for (let key in vals) {
            if (vals.hasOwnProperty(key)) {
              diffMap.removeLayer(key)
              diffMap.addLayer(descriptor[key])
            }
          }
          break
        case 3: // Delete
          vals = delta[0]
          for (let key in vals) {
            if (vals.hasOwnProperty(key)) {
              diffMap.removeLayer(key)
            }
          }
          break
        default:
          throw new Error("Invalid delta length")
      }
    } 
    // else {
    //   // for (let key in delta) {
    //   //   const newData = descriptor[key].data
    //   //   diffMap.getSource(key).setData(newData)
    //   // }
    // }
  }
}

function patchControls(diffMap, delta, descriptor) {

}

function patchCanvas(diffMap, delta, descriptor) {
  if (delta) {
    if (descriptor.style && descriptor.style.cursor) {
      diffMap.getCanvas().style.cursor = descriptor.style.cursor
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
      const {controls, map, sources, layers, canvas} = descriptor
      diffMap = new mapboxgl.Map(descriptor.map)
      return O.create(observer => {
        diffMap.on('load', function () {
          /*** HACK to allow for enable/disable from outset */
          diffMap.dragPan.disable()
          diffMap.dragPan.enable()
          /*** End HACK */

          if (controls) {

          }

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

          if (canvas) {
            if (canvas.style && canvas.style.cursor) {
              diffMap.getCanvas().style.cursor = canvas.style.cursor
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
    const out$ = diffMap$.switchMap(diffMap => {
      return event$.map(e => {
        const layers = info && info.layers && info.layers.filter(x => diffMap.getLayer(x))
        if (layers) {
          const features = diffMap.queryRenderedFeatures(e.point, {layers})
          return features
        } 

        return undefined
      })
      //.filter(x => x.length)
      .publish().refCount()
    })

    const observable = runSA ? runSA.adapt(out$, rxjsSA.streamSubscribe) : out$
    return observable
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
      queryRenderedFilter: makeQueryRenderedFilter(diffMap$, out$, runSA)
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

export function makeMapJSONDriver(accessToken: string) {
  if (!accessToken || (typeof(accessToken) !== 'string')) throw new Error(`MapDOMDriver requires an access token.`)

  if(!mapboxgl.accessToken) {
    mapboxgl.accessToken = accessToken
  }

  function mapJSONDriver(descriptor$, runSA) {

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

  ;(<any> mapJSONDriver).streamAdapter = rxjsSA
  return mapJSONDriver
}