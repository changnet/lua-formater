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

## clang-format
https://github.com/llvm-mirror/clang/blob/master/tools/clang-format/ClangFormat.cpp

1. main() @ tools/clang-format/ClangFormat.cpp
2. static bool format(StringRef FileName) @ tools/clang-format/ClangFormat.cpp
3. reformat(const FormatStyle &Style, @ lib\Format\Format.cpp
```cpp
// reformat里，把函数放进Passes里，最后一个函数是
  Passes.emplace_back([&](const Environment &Env) {
    return Formatter(Env, Expanded, Status).process();
  });
// 因此格式化的代码主要是在formater中处理

// 把格式化参数传给FormatTokenLexer
// 然后parser用FormatTokenLexer来解析token
// token的解析在UnwrappedLineParser::parseLevel
```
4. Formatter(Env, Expanded, Status).process() @ lib\Format\Format.cpp
5. TokenAnalyzer::process @ lib\Format\TokenAnalyzer.cpp
5. FormatTokenLexer::lex() @ lib\Format\FormatTokenLexer.cpp
6. UnwrappedLineParser::parseLevel @ lib\Format\UnwrappedLineParser.cpp

```ts
// 扩展token，把注释放到列表中的对应位置
interface TokenEx exten Token {

}

// local x = a b = 2
// 必须要得语法，才知道要如何处理

// 因此参考luaparse的解析，加上容错处理即可

let tokenList = [];
for (let token of tokenList) {
    
}
```
