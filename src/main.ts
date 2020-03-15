#!/usr/bin/env node

import { Formater } from "./formater";

// node out/main.js
let fmt = new Formater();

// test comment
const comment = `-- abc
-- def

-- xyz

--[[123]] --[[456]]
`;
console.log(fmt.format(comment));

// test function
const func = `function a.test( a, b , c ) end`
console.log(fmt.format(func));
