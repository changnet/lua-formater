The step i build this package.

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
