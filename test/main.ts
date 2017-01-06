import {Observable as O} from 'rxjs'
import Cycle from '@cycle/rxjs-run'
import {makeDOMDriver, div} from '@cycle/dom'
import {makeMapJSONDriver} from '../main'


function between(first, second) {
  return (source) => first.switchMap(() => {
    return source.takeUntil(second)
  })
}
function toGeoJSON(lngLat) {
  return {
      type: "FeatureCollection",
      features: [{
          type: "Feature",
          geometry: {
              type: "Point",
              coordinates: [lngLat.lng, lngLat.lat]
          },
          properties: {
            title: "Some location",
            icon: "marker"
          }
      }]
  }
}

function main(sources) {

  const marker = {lng: -74.5, lat: 40}
  const mapSources = {
    marker: {
      type: `geojson`,
      data: toGeoJSON(marker)
    }
  }

  const layers = {
    marker: {
      id: `marker`,
      //type: `symbol`,
      type: `circle`,
      source: `marker`,
      paint: {
        "circle-color": "#FF0000",
        "circle-radius": 10
      }
      // layout: {
      //     "icon-image": `{icon}-15`,
      //     "icon-size": 1.5,
      //     //"text-field": `{title}`,
      //     "text-font": [`Open Sans Semibold`, `Arial Unicode MS Bold`],
      //     "text-offset": [0, 0.6],
      //     "text-anchor": `top`
      // }
    }
  }

  const anchorId = `mapdiv`
  const descriptor = {
    controls: {},
    map: {
      container: anchorId, 
      style: `mapbox://styles/mapbox/bright-v9`, //stylesheet location
      center: [-74.50, 40], // starting position
      zoom: 9, // starting zoom,
      dragPan: true,
      scrollZoom: false
    },
    sources: mapSources,
    layers,
    canvas: {
      style: {
        cursor: `grab`
      }
    },
    options: {
      offset: [100, 100]
    }
  }

  // const mapClick$ = sources.MapJSON.select(anchorId).events(`click`).observable
  //    .map(ev => {
  //      return ev.lngLat
  //    })
  //    .publish().refCount()

  // const mapAccessor = sources.MapJSON.select(anchorId)
  // const mouseDown$ = mapAccessor.events(`mousedown`)
  //   .queryRenderedFilter({
  //     layers: [`venue`]
  //   })
  //   .filter(x => x && x.length)
  //   //.do(x => console.log(`mouseDown$`, x))
  //   .publish().refCount()

  // const mouseMove$ = mapAccessor.events(`mousemove`).observable
  // const mouseUp$ = mapAccessor.events(`mouseup`).observable
  //     //.do(x => console.log(`mouseup$`, x))
  //     .publish().refCount()
  // const markerMove$ = mouseMove$.let(between(mouseDown$, mouseUp$))
  //   .map(ev => ev.lngLat)
  //   .publish().refCount()

  // const mapClick$ = mapAccessor.events(`click`).observable

  // return {
  //   DOM: markerMove$
  //    .map(x => JSON.stringify(x))
  //    .startWith(`blah`)
  //    .map(x => div([
  //       div(`#${anchorId}`, []),
  //       div([x])
  //     ])),
  //   MapJSON: O.merge(markerMove$
  //     .map(x => {
  //       descriptor.sources.venue.data = toGeoJSON(x)
  //       return JSON.parse(JSON.stringify(descriptor))
  //     })
  //     .startWith(JSON.parse(JSON.stringify(descriptor))),
  //     // mouseDown$.map(() => {
  //     //   descriptor.map.dragPan = false
  //     //   return JSON.parse(JSON.stringify(descriptor))
  //     // }),
  //     // mouseUp$.map(() => {
  //     //   descriptor.map.dragPan = true
  //     //   return JSON.parse(JSON.stringify(descriptor))
  //     // }),
  //     mapClick$.map(ev => {
  //       mapSources.venue.data = toGeoJSON(ev.lngLat)
  //       descriptor.sources = mapSources
  //       descriptor.layers = layers
  //       return JSON.parse(JSON.stringify(descriptor))
  //     })
  //   )
  // }


  const mapAccessor = sources.MapJSON.select(anchorId)
  const mouseDown$ = mapAccessor.events(`mousedown`)
    .queryRenderedFilter({
      layers: [`marker`]
    })
    .filter(x => x && x.length)
    .publish().refCount()

  const mouseMoveObj = mapAccessor.events(`mousemove`)
  const mouseMove$ = mouseMoveObj.observable
    .publish().refCount()

  const markerHover$ = mouseMoveObj
    .queryRenderedFilter({
      layers: [`marker`]
    })
    .map(x => !!(x && x.length))
    .distinctUntilChanged()
    .publish().refCount()

  const mouseUp$ = mapAccessor.events(`mouseup`).observable
    .publish().refCount()
  const markerMove$ = mouseMove$.let(between(mouseDown$, mouseUp$))
    .map(ev => ev.lngLat)
    .publish().refCount()

  const state$ = O.merge(
    markerMove$.map(x => state => {
      state.lngLat = x
      return state
    }),
    markerHover$.map(x => state => {
      state.hover = x
      return state
    })
  )
  .startWith({lngLat: marker, hover: false})
  .scan((acc, f: Function) => f(acc))


  return {
    DOM: markerMove$
     .map(x => JSON.stringify(x))
     .startWith(`blah`)
     .map(x => div([
        div(`#${anchorId}`, []),
        div([x])
      ])),
    MapJSON: state$.map(({lngLat, hover}) => {
      descriptor.map.dragPan = hover ? false : true
      descriptor.sources.marker.data = toGeoJSON(lngLat)
      descriptor.canvas.style.cursor = hover ? `move` : `pointer`
      return JSON.parse(JSON.stringify(descriptor))
    })
  }





}

Cycle.run(main, {
  DOM: makeDOMDriver(`#app`),
  MapJSON: makeMapJSONDriver(
    `pk.eyJ1IjoibXJyZWRlYXJzIiwiYSI6ImNpbHJsZnJ3NzA4dHZ1bGtub2hnbGVnbHkifQ.ph2UH9MoZtkVB0_RNBOXwA`
  )
})