This is my first node.js package.
Just write down the steps I build this package.

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

如何创建可从cmd运行的node.js库：
https://medium.com/@thatisuday/creating-cli-executable-global-npm-module-5ef734febe32

记得在 main.ts 加上
```ts
#!/usr/bin/env node
```

#### 初始化
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

#### 导出符号types
1. 在tsconfig.json的compilerOptions中添加 "declaration": true,
2. 在tsconfig.json的exclude中添加输出目录out
3. 在package.json中添加 "types": "./out/index.d.ts",

https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html

#### 测试
vs code运行一次build任务后，会在后台监视文件变动并实时编译，不需要再手动编译
1. node out/main.js
2. 模拟包安装
```shell
cd lua-formater
npm link
lua-formater
```

## clang-format
https://github.com/llvm-mirror/clang/blob/master/tools/clang-format/ClangFormat.cpp

* main() @ tools/clang-format/ClangFormat.cpp
* static bool format(StringRef FileName) @ tools/clang-format/ClangFormat.cpp
* reformat(const FormatStyle &Style, @ lib\Format\Format.cpp
```cpp
// reformat里，把函数放进Passes里，最后一个函数是
  Passes.emplace_back([&](const Environment &Env) {
    return Formatter(Env, Expanded, Status).process();
  });
// 因此格式化的代码主要是在formater中处理

// 把格式化参数传给FormatTokenLexer
// 然后parser用FormatTokenLexer来解析token
// token的解析在UnwrappedLineParser::parseLevel
// Whitespaces.generateReplacements 这里进行断行，空格对齐
```
* Formatter(Env, Expanded, Status).process() @ lib\Format\Format.cpp
* TokenAnalyzer::process @ lib\Format\TokenAnalyzer.cpp
* FormatTokenLexer::lex() @ lib\Format\FormatTokenLexer.cpp
* UnwrappedLineParser::parseLevel @ lib\Format\UnwrappedLineParser.cpp
* Whitespaces.generateReplacements @ lib\Format\WhitespaceManager.cpp

```ts
  //     赋值
  //     assignment ::= varlist '=' explist
  //     var ::= Name | prefixexp '[' exp ']' | prefixexp '.' Name
  //     varlist ::= var {',' var} -> a, b
  //     explist ::= exp {',' exp} -> a[idx], b[index]
  //
  //     call ::= callexp
  //     callexp ::= prefixexp args | prefixexp ':' Name args
  function parseAssignmentOrCallStatement() {}

  //     前缀表达式
  //     prefixexp ::= prefix {suffix}
  //     prefix ::= Name | '(' exp ')' -> test | (tbl[idx])
  //     suffix ::= '[' exp ']' | '.' Name | ':' Name args | args
  //     -> test[index] | test.a | test:b | (a, b, c)
  //
  //     args ::= '(' [explist] ')' | tableconstructor | String

  function parsePrefixExpression() {}

  //     exp ::= (unop exp | primary | prefixexp ) { binop exp }
  //     -> not ok | { 1, 2} | ... 

  function parseSubExpression(minPrecedence) {}
```

## luaparse
* parseChunk
* parseBlock

