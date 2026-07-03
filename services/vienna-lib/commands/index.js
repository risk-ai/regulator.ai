"use strict";
/**
 * Vienna Command System
 *
 * Deterministic command parsing and layered classification.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayeredClassifier = exports.KeywordClassifier = exports.DeterministicCommandParser = void 0;
__exportStar(require("./types.js"), exports);
var parser_js_1 = require("./parser.js");
Object.defineProperty(exports, "DeterministicCommandParser", { enumerable: true, get: function () { return parser_js_1.DeterministicCommandParser; } });
var keyword_js_1 = require("./keyword.js");
Object.defineProperty(exports, "KeywordClassifier", { enumerable: true, get: function () { return keyword_js_1.KeywordClassifier; } });
var classifier_js_1 = require("./classifier.js");
Object.defineProperty(exports, "LayeredClassifier", { enumerable: true, get: function () { return classifier_js_1.LayeredClassifier; } });
