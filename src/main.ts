#!/usr/bin/env node

import { Setting } from "./setting";
import { Formater } from "./formater";

// node out/main.js

let setting = new Setting();

let fmt = new Formater(setting.parseSetting());

// test comment
const comment = `-- abc
-- def

-- xyz

--[[123]] --[[456]]
`;
console.log(fmt.format(comment));

// test function
fmt = new Formater(setting.parseSetting());
const func = `function a.test( a, b , c ) end`;
console.log(fmt.format(func));
