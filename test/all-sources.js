// Istanbul can only report on what webpack put into the bundle, so a source file nobody imports is
// missing from the report entirely instead of showing up with 0%. Pulling every file in keeps the
// untested ones visible.
//
// import.meta.webpackContext is the esm form of require.context - the package is type module, so
// require is not available here.
const sources = import.meta.webpackContext("../src", {recursive : true, regExp : /\.js$/});
sources.keys().forEach(sources);
