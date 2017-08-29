'use strict';

const flatten = require('flat');
const castArray = require('lodash/castArray');
const some = require('lodash/some');
const isPlainObject = require('lodash/isPlainObject');
const camelCase = require('lodash/camelCase');
const kebabCase = require('lodash/kebabCase');
const omitBy = require('lodash/omitBy');

function isAlias(key, alias) {
    return some(alias, (aliases) => castArray(aliases).indexOf(key) !== -1);
}

function isCamelCased(key, argv) {
    return /[A-Z]/.test(key) && camelCase(key) === key && // Is it camel case?
        argv[kebabCase(key)] != null; // Is the standard version defined?
}

function keyToFlag(key) {
    return key.length === 1 ? `-${key}` : `--${key}`;
}

function unparseOption(key, value, unparsed) {
    if (typeof value === 'string') {
        unparsed.push(keyToFlag(key), value);
    } else if (value === true) {
        unparsed.push(keyToFlag(key));
    } else if (value === false) {
        unparsed.push(`--no-${key}`);
    } else if (Array.isArray(value)) {
        unparsed.push(keyToFlag(key), ...value.map((item) => `${item}`));
    } else if (isPlainObject(value)) {
        const flattened = flatten(value, { safe: true });

        for (const flattenedKey in flattened) {
            unparseOption(`${key}.${flattenedKey}`, flattened[flattenedKey], unparsed);
        }
    // Fallback case (numbers and other types)
    } else if (value != null) {
        unparsed.push(keyToFlag(key), `${value}`);
    }
}

// ------------------------------------------------------------

function unparser(argv, options) {
    options = Object.assign({
        alias: {},
    }, options);

    const unparsed = [];

    // Unparse positional arguments
    argv._ && unparsed.push(...argv._);

    // Unparse option arguments
    const optionsArgv = omitBy(argv, (value, key) =>
        // Remove special _, -- and $0
        key === '_' || key === '--' || key === '$0' ||
        // Remove aliases
        isAlias(key, options.alias) ||
        // Remove camel-cased
        isCamelCased(key, argv));

    for (const key in optionsArgv) {
        unparseOption(key, optionsArgv[key], unparsed);
    }

    // Unparse ending (--) arguments if set
    argv['--'] && unparsed.push('--', ...argv['--']);

    return unparsed;
}

module.exports = unparser;
