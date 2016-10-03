import {Observable as O} from 'rxjs'
import DiffPatchMap from './diffPatchMap'
import fromEvent from './fromevent'

import rxjsSA from '@cycle/rxjs-adapter'

const g_unanchoredLedger = {}
//const g_anchoredLedger = {}

function diffAndPatch(descriptor, accessToken) {
  if (typeof descriptor === `undefined` || !descriptor) { return undefined }

  const anchorId = descriptor.map.container
  const anchor = document.getElementById(anchorId)
  //console.log(anchor)
  if (!anchor) {
    //console.log(`not anchored`)
    g_unanchoredLedger[anchorId] = descriptor
    return null
  } else {
    //console.log(`anchored`)
    let diffMap = anchor['diffMap']

    if (!diffMap) {
      diffMap = new DiffPatchMap(accessToken, descriptor)
      anchor['diffMap'] = diffMap
    } else {
      diffMap.patch(descriptor)
    }

    return descriptor
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
    .map(descriptor => {
      return diffAndPatch(descriptor, accessToken)
    })
    .filter(x => !!x)
    .publish().refCount()

  return patch$
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

    return runSA ? runSA.adapt(out$, rxjsSA.streamSubscribe) : out$
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

function makeMapDOMDriver(accessToken) {
  if (!accessToken || (typeof(accessToken) !== 'string' && !(accessToken instanceof String))) throw new Error(`MapDOMDriver requires an access token.`)

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

  (<any> mapDOMDriver).streamAdapter = rxjsSA
  return mapDOMDriver
}

export {
  makeMapDOMDriver
}
