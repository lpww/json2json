var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

var sysmo = (typeof require === "function" ? require('sysmo') : void 0) || (typeof window !== "undefined" && window !== null ? window.Sysmo : void 0);

var TemplateConfig = (typeof require === "function" ? require('./TemplateConfig') : void 0) || (typeof window !== "undefined" && window !== null ? window.json2json.TemplateConfig : void 0);

function ObjectTemplate(config, parent) {
  this.config = new TemplateConfig(config);
  this.parent = parent;
}

ObjectTemplate.prototype.transform = function(data) {
  var node = this.nodeToProcess(data);
  if (node == null) {
    return null;
  }
  switch (sysmo.type(node)) {
    case 'Array':
      return this.processArray(node);
    case 'Object':
      return this.processMap(node);
    default:
      return null;
  }
};

ObjectTemplate.prototype.processArray = function(node) {
  var context, element, i, index, key, len, value;
  context = this.config.arrayToMap ? {} : [];
  for (index = i = 0, len = node.length; i < len; index = ++i) {
    element = node[index];
    key = this.config.arrayToMap ? this.chooseKey(element) : index;
    value = this.createMapStructure(element);
    if (this.config.arrayToMap && this.config.ensureArray && (context[key] == null)) {
      value = [value];
    }
    this.updateContext(context, element, value, key);
  }
  return context;
};

ObjectTemplate.prototype.processMap = function(node) {
  var context, nested_context, nested_key;
  if (this.config.ensureArray) {
    return this.processArray([node]);
  }
  context = this.createMapStructure(node);
  if (this.config.nestTemplate && (nested_key = this.chooseKey(node))) {
    nested_context = {};
    nested_context[nested_key] = context;
    context = nested_context;
  }
  return context;
};

ObjectTemplate.prototype.createMapStructure = function(node) {
  var context, key, nested, value;
  context = {};
  if (!this.config.nestTemplate) {
    return this.chooseValue(node, context);
  }
  for (key in node) {
    value = node[key];
    if (!(this.config.processable(node, value, key))) {
      continue;
    }
    nested = this.getNode(node, key);
    value = this.chooseValue(nested);
    this.updateContext(context, nested, value, key);
  }
  return context;
};

ObjectTemplate.prototype.chooseKey = function(node) {
  var result;
  result = this.config.getKey(node);
  switch (result.name) {
    case 'value':
      return result.value;
    case 'path':
      return this.getNode(node, result.value);
    default:
      return null;
  }
};

ObjectTemplate.prototype.chooseValue = function(node, context) {
  var result;
  if (context == null) {
    context = {};
  }
  result = this.config.getValue(node);
  switch (result.name) {
    case 'value':
      return result.value;
    case 'path':
      return this.getNode(node, result.value);
    case 'template':
      return this.processTemplate(node, context, result.value);
    default:
      return null;
  }
};

ObjectTemplate.prototype.processTemplate = function(node, context, template) {
  var filter, key, value;
  if (template == null) {
    template = {};
  }
  for (key in template) {
    value = template[key];
    switch (sysmo.type(value)) {
      case 'String':
        filter = (function(_this) {
          return function(node, path) {
            return _this.getNode(node, path);
          };
        })(this);
        break;
      case 'Array':
        filter = (function(_this) {
          return function(node, paths) {
            var i, len, path, results;
            results = [];
            for (i = 0, len = paths.length; i < len; i++) {
              path = paths[i];
              results.push(_this.getNode(node, path));
            }
            return results;
          };
        })(this);
        break;
      case 'Function':
        filter = (function(_this) {
          return function(node, value) {
            return value.call(_this, node, key);
          };
        })(this);
        break;
      case 'Object':
        filter = (function(_this) {
          return function(node, config) {
            return new _this.constructor(config, _this).transform(node);
          };
        })(this);
        break;
      default:
        filter = function(node, value) {
          return value;
        };
    }
    value = filter(node, value);
    this.updateContext(context, node, value, key);
  }
  this.processRemaining(context, node);
  return context;
};

ObjectTemplate.prototype.processRemaining = function(context, node) {
  var key, value;
  for (key in node) {
    value = node[key];
    if (!this.pathAccessed(node, key) && indexOf.call(context, key) < 0 && this.config.processable(node, value, key)) {
      this.updateContext(context, node, value, key);
    }
  }
  return context;
};

ObjectTemplate.prototype.updateContext = function(context, node, value, key) {
  var formatted, i, item, len, results;
  formatted = this.config.applyFormatting(node, value, key);
  if (sysmo.isArray(formatted)) {
    results = [];
    for (i = 0, len = formatted.length; i < len; i++) {
      item = formatted[i];
      results.push(this.aggregateValue(context, item.key, item.value));
    }
    return results;
  } else if (formatted != null) {
    return this.aggregateValue(context, formatted.key, formatted.value);
  }
};

ObjectTemplate.prototype.aggregateValue = function(context, key, value) {
  var existing;
  if (!((value != null) || !this.config.ignoreEmpty)) {
    return context;
  }
  if (sysmo.isArray(context)) {
    context.push(value);
    return context;
  }
  existing = context[key];
  if (this.config.aggregate(context, key, value, existing)) {
    return context;
  }
  if (existing == null) {
    context[key] = value;
  } else if (!sysmo.isArray(existing)) {
    context[key] = [existing, value];
  } else {
    context[key].push(value);
  }
  return context;
};

ObjectTemplate.prototype.nodeToProcess = function(node) {
  return this.getNode(node, this.config.getPath());
};

ObjectTemplate.prototype.getNode = function(node, path) {
  if (!path) {
    return null;
  }
  if (path === '.') {
    return node;
  }
  this.paths(node, path);
  return sysmo.getDeepValue(node, path, true);
};

ObjectTemplate.prototype.pathAccessed = function(node, path) {
  var key;
  key = path.split('.')[0];
  return this.paths(node).indexOf(key) !== -1;
};

ObjectTemplate.prototype.paths = function(node, path) {
  var index, paths;
  if (path) {
    path = path.split('.')[0];
  }
  this.pathNodes || (this.pathNodes = this.parent && this.parent.pathNodes || []);
  this.pathCache || (this.pathCache = this.parent && this.parent.pathCache || []);
  index = this.pathNodes.indexOf(node);
  if (!path) {
    return (index !== -1 ? this.pathCache[index] : []);
  }
  if (index === -1) {
    paths = [];
    this.pathNodes.push(node);
    this.pathCache.push(paths);
  } else {
    paths = this.pathCache[index];
  }
  if (path && paths.indexOf(path) === -1) {
    paths.push(path);
  }
  return paths;
};

if (typeof module !== "undefined" && module !== null) {
  module.exports = ObjectTemplate;
} else {
  window.json2json || (window.json2json = {});
  window.json2json.ObjectTemplate = ObjectTemplate;
}