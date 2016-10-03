import * as jsondiffpatch from 'jsondiffpatch'

interface DiffMapDescriptor {
  controls: any
  map: mapboxgl.MapboxOptions
}
export default class DiffPatchMap {
  _map: mapboxgl.Map;
  
  constructor(
    private _accessToken: string,
    private _descriptor: DiffMapDescriptor
  ) {

    if(!mapboxgl.accessToken) {
      mapboxgl.accessToken =  _accessToken
    }

    this._map = new mapboxgl.Map(_descriptor.map)
  }

  getMap() {
    return this._map
  }

  patch(descriptor) {
    const delta = jsondiffpatch.diff(this._descriptor, descriptor)
    const {controls, map} = delta
    if (map) {
      if (map.center || map.zoom) {
        this._map.easeTo({
          center: descriptor.map.center,
          zoom: descriptor.map.zoom
        })
      }
    }
    
    this._descriptor = descriptor
  }
}