#!/usr/bin/env node

import { Formater } from "./formater";

// node out/main.js
let fmt = new Formater();
const ctx = fmt.format("function a.test( a, b , c ) end");
console.log(ctx);

