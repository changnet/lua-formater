This is my first package.
The step i build this package.

## package.json
https://docs.npmjs.com/files/package.json

#### main
The main field is a module ID that is the primary entry point to your program. That is, if your package is named foo, and a user installs it, and then does require("foo"), then your main module’s exports object will be returned.

This should be a module ID relative to the root of your package folder.

For most modules, it makes the most sense to have a main script and often not much else.

#### bin
If you have a single executable, and its name should be the name of the package, then you can just supply it as a string. For example:

"bin": "./path/to/program"

https://github.com/wookieb/predicates
https://github.com/phenomnomnominal/tsquery

1. git clone https://github.com/changnet/lua-formater.git
2. cd lua-formater
3. npm i typescript -g
4. add project files manually
```shell
package.json
tsconfig.json
tslint.json
```
or you can

```shell
npm init
npm install typescript -g
tsc --init
npm install tslint -g
tslint --init
```
I work with vs code, it come with tsc,no need to install a global one.

5. configure task.json
