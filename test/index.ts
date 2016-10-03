import {Observable as O} from 'rxjs'
import Cycle from '@cycle/rxjs-run'
import {makeDOMDriver, div} from '@cycle/dom'
import {makeMapDOMDriver} from '../index'

function main(sources) {

    const anchorId = `mapdiv`
    const descriptor = {
      controls: {},
      map: {
        container: anchorId, 
        style: 'mapbox://styles/mapbox/streets-v9', //stylesheet location
        center: [-74.50, 40], // starting position
        zoom: 9 // starting zoom
      }
  }

  const mapClick$ = sources.MapDOM.select(anchorId).events(`click`)
     .map(ev => {
       return ev.lngLat
     })
     .publish().refCount()
     
  return {
    DOM: mapClick$
     .map(x => JSON.stringify(x))
     .startWith(`blah`)
     .map(x => div([
        div(`#${anchorId}`, []),
        div([x])
      ])),
    MapDOM: mapClick$
      .map(x => {
        descriptor.map.center = [x.lng, x.lat]
        return JSON.parse(JSON.stringify(descriptor))
      })
      .startWith(JSON.parse(JSON.stringify(descriptor)))
  }
}

Cycle.run(main, {
  DOM: makeDOMDriver(`#app`),
  MapDOM: makeMapDOMDriver(
    `pk.eyJ1IjoibXJyZWRlYXJzIiwiYSI6ImNpbHJsZnJ3NzA4dHZ1bGtub2hnbGVnbHkifQ.ph2UH9MoZtkVB0_RNBOXwA`
  )
})