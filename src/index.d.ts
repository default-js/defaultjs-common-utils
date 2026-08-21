/**
 * Entry point of the package.
 *
 * Importing it also pulls in the javascript module, which extends String and Map. Ready,
 * ServiceHelper and the XmlToJson converter are not part of this surface and have to be imported
 * from their own file.
 */
import "./javascript/index.js";
import ObjectUtils from "./ObjectUtils.js";
import GLOBAL from "./Global.js";
import Escaper from "./Escaper.js";
import ValueHelper from "./ValueHelper.js";
import PromiseUtils from "./PromiseUtils.js";
import PrivateProperty from "./PrivateProperty.js";
import UUID from "./UUID.js";

export { GLOBAL, ObjectUtils, Escaper, ValueHelper, PromiseUtils, PrivateProperty, UUID };
