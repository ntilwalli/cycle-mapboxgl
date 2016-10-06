declare module "jsondiffpatch" {

  interface IProcessorOptions {}
  
  export class DiffPatcher {
    constructor(options?: IProcessorOptions);
    options(...args: any[]): IProcessorOptions;
    diff(left: any, right: any): any;
    patch(left: any, delta: any): any;
    reverse(delta: any): any;
    unpatch(right: any, delta: any): any;
    clone(value: any): any;
  }
  
  interface IFormatters {
    base: any;
    html: any;
    annotated: any;
    jsonpatch: any;
  }

  export function create(options?: IProcessorOptions): DiffPatcher;
  export function dateReviver(key: any, value: string): string | Date;
  export function diff(left: any, right: any): any;
  export function patch(left: any, delta: any): any;
  export function reverse(delta: any): any;
  export function unpatch(right: any, delta: any): any;
  export function clone(value: any): any;
  export const homepage: string;
  export const version: string;
  export const formatters: IFormatters | any;
  export const console: any
}