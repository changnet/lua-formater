#!/usr/bin/env node

import { Setting } from "./setting";
import { Formater } from "./formater";

// node out/main.js

let setting = new Setting();

let fmt = new Formater(setting.parseSetting());

// test comment
const comment = `-- abc
local a = false

-- def
`;
console.log(fmt.format(comment));

// test function
fmt = new Formater(setting.parseSetting());
const func = `function a.test( a, b , c ) end`;
//console.log(fmt.format(func));

// test expression
const expression = `local a,b,c=not true,1 + test(#list, {
    a = 1, b = false, c = 1 + 2
})
`;
fmt = new Formater(setting.parseSetting());
//console.log(fmt.format(expression));

// table call: print { 1, 2, 3}
// string call : print "abcdef"
