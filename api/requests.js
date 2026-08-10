import {requestProxy} from './_request-proxy.js';
export default async function handler(req,res){return requestProxy(req,res,['GET']);}
