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

## limitation
* 在非语法节点中的注释，无法正确注入
```lua
local --[[abc]] function test( --[[def]] )
    -- xyz
end

-- 这里的abc与 local function之前，luaparse解析时这两者之前不会产生任何语法节点
-- def与xyz之间，是没有语法节点的
-- 处理的话，用range去检测原始的代码，判断它们的位置

test(a, --[[eee]] b, c)
-- 现在eee是放到a中作为尾注释的，因为逗号不是语法节点，知道a、b之前有一个注释
-- 但不知道在逗号之前还是之后，也考虑用range去判断一下
```

```lua
-- 必须是多行的，在ctx中返回就是多行的，但还未处理缩进
-- 返回后加上处理即可
-- 如
local function a() end
local function b() end

-- 原来是一行的，返回加上缩进后，变成多行
-- 全部格式化成多行，返回后，如果计算得出可入一行，则再将多行拼成一行
-- 如
local a = function(a, b, c) test(a, b, c) end
local a = function(a, b, c)
  test(a, b, c)
end

-- 如果不去计算下一层，则上一层无法确定是否换行
-- 上一层没有格式化，则下一层缩进断行未确定，也无法格式化，最终回溯到最顶层，都只得到各种ctx
-- 

-- 先遍历一次，计算长度，以及是否必须换行(如存在单行注释测必须换行)把这些信息都附加到节点上
-- 再遍历一次，计算出换行点，得出格式化
```