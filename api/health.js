import { proxy } from './_proxy.js';
export default function handler(req,res){ return proxy(req,res,'health',['GET']); }
