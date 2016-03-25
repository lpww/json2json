var sysmo = (typeof require === "function" ? require('sysmo') : void 0) || (typeof window !== "undefined" && window !== null ? window.Sysmo : void 0);

function TemplateConfig(config) {
  config.path || (config.path = '.');
  config.as || (config.as = {});
  if (sysmo.isString(config.choose)) {
    config.choose = [config.choose];
  }
  if (sysmo.isString(config.include)) {
    config.include = [config.include];
  }
  this.arrayToMap = !!config.key;
  this.mapToArray = !this.arrayToMap && config.key === false && !config.as;
  this.directMap = !!(this.arrayToMap && config.value);
  this.nestTemplate = !!config.nested;
  this.includeAll = !!config.all;
  this.ensureArray = !!config.ensureArray;
  this.ignoreEmpty = config.ignoreEmpty !== false;
  this.config = config;
}

TemplateConfig.prototype.getPath = function() {
  return this.config.path;
};

TemplateConfig.prototype.getKey = function(node) {
  switch (sysmo.type(this.config.key)) {
    case 'Function':
      return {
        name: 'value',
        value: this.config.key(node)
      };
    default:
      return {
        name: 'path',
        value: this.config.key
      };
  }
};

TemplateConfig.prototype.getValue = function(node, context) {
  switch (sysmo.type(this.config.value)) {
    case 'Function':
      return {
        name: 'value',
        value: this.config.value(node)
      };
    case 'String':
      return {
        name: 'path',
        value: this.config.value
      };
    default:
      return {
        name: 'template',
        value: this.config.as
      };
  }
};

TemplateConfig.prototype.processable = function(node, value, key) {
  var i, len, path, paths, ref;
  if (!this.config.choose && this.includeAll) {
    return true;
  }
  if (!this.config.choose && !this.paths) {
    this.paths = [];
    ref = this.config.as;
    for (key in ref) {
      value = ref[key];
      if (sysmo.isString(value)) {
        this.paths.push(value.split('.')[0]);
      }
    }
  }
  if (sysmo.isArray(this.config.choose)) {
    paths = this.paths || [];
    paths = paths.concat(this.config.choose);
    for (i = 0, len = paths.length; i < len; i++) {
      path = paths[i];
      if (path.split('.')[0] === key) {
        return true;
      }
    }
    return false;
  }
  if (!sysmo.isFunction(this.config.choose)) {
    return !!(this.includeAll || this.directMap);
  } else {
    return !!this.config.choose.call(this, node, value, key);
  }
};

TemplateConfig.prototype.aggregate = function(context, key, value, existing) {
  var aggregator, ref;
  aggregator = ((ref = this.config.aggregate) != null ? ref[key] : void 0) || this.config.aggregate;
  if (!sysmo.isFunction(aggregator)) {
    return false;
  }
  context[key] = aggregator(key, value, existing);
  return true;
};

TemplateConfig.prototype.applyFormatting = function(node, value, key) {
  var formatter, pair, ref;
  if (!sysmo.isNumber(key)) {
    formatter = ((ref = this.config.format) != null ? ref[key] : void 0) || this.config.format;
    pair = sysmo.isFunction(formatter) ? formatter(node, value, key) : {};
  } else {
    pair = {};
  }
  if (!('key' in pair)) {
    pair.key = key;
  }
  if (!('value' in pair)) {
    pair.value = value;
  }
  return pair;
};

if (typeof module !== "undefined" && module !== null) {
  module.exports = TemplateConfig;
} else {
  window.json2json || (window.json2json = {});
  window.json2json.TemplateConfig = TemplateConfig;
}