var core                     = require("../level1/core").dom.level1.core,
    INVALID_STATE_ERR        = core.INVALID_STATE_ERR        = 11,
    SYNTAX_ERR               = core.SYNTAX_ERR               = 12,
    INVALID_MODIFICATION_ERR = core.INVALID_MODIFICATION_ERR = 13,
    NAMESPACE_ERR            = core.NAMESPACE_ERR            = 14,
    INVALID_ACCESS_ERR       = core.INVALID_ACCESS_ERR       = 15,
    ns = {
      validate : function(ns, URI) {
        if (!ns) {
          throw new core.DOMException(core.INVALID_CHARACTER_ERR, "namespace is undefined");
        }

        if(ns.match(/[^0-9a-z\.:\-_]/i) !== null) {
          throw new core.DOMException(core.INVALID_CHARACTER_ERR, ns);
        }

        var msg = false, parts = ns.split(':');
        if (ns === 'xmlns'                          &&
            URI !== "http://www.w3.org/2000/xmlns/")
        {
          msg = "localName is 'xmlns' but the namespaceURI is invalid";

        } else if (ns === "xml"                                   &&
                   URI !== "http://www.w3.org/XML/1998/namespace")
        {
          msg = "localName is 'xml' but the namespaceURI is invalid";

        } else if (ns[ns.length-1] === ':') {
          msg = "Namespace seperator found with no localName";

        } else if (ns[0] === ':') {
          msg = "Namespace seperator found, without a prefix";

        } else if (parts.length > 2) {
          msg = "Too many namespace seperators";

        }

        if (msg) {
          throw new core.DOMException(NAMESPACE_ERR, msg + " (" + ns + "@" + URI + ")");
        }
      }
    };

core.exceptionMessages['NAMESPACE_ERR'] = "Invalid namespace";

core.DOMImplementation.prototype.createDocumentType = function(/* String */ qualifiedName,
                                                               /* String */ publicId,
                                                               /* String */ systemId)
{
  ns.validate(qualifiedName);
  var doctype = new core.DocumentType(null, qualifiedName);
  doctype._publicId = publicId ? publicId : '';
  doctype._systemId = systemId ? systemId : '';
  return doctype;
};

/**
  Creates an XML Document object of the specified type with its document element.
  HTML-only DOM implementations do not need to implement this method.
*/
core.DOMImplementation.prototype.createDocument = function(/* String */       namespaceURI,
                                                           /* String */       qualifiedName,
                                                           /* DocumentType */ doctype)
{
  ns.validate(qualifiedName, namespaceURI);

  if (doctype && doctype._ownerDocument !== null) {
    throw new core.DOMException(core.WRONG_DOCUMENT_ERR);
  }

  if (qualifiedName.indexOf(':') > -1 && !namespaceURI) {
    throw new core.DOMException(NAMESPACE_ERR);
  }

  var document = new core.Document();
  document.doctype = doctype || null;

  if (doctype && !doctype.entities) {
    doctype.entities = new dom.EntityNodeMap();
  }

  document._ownerDocument = document;

  if (qualifiedName) {
    var docElement = document.createElementNS(namespaceURI, qualifiedName);
    document.appendChild(docElement);
  }

  return document;
};

core.Node.prototype.__defineGetter__("ownerDocument", function() {
  return this._ownerDocument || null;
});

core.Node.prototype.isSupported = function(/* string */ feature,
                                           /* string */ version)
{
  return this._ownerDocument.implementation.hasFeature(feature, version);
};

core.Node.prototype._namespaceURI = null;
core.Node.prototype.__defineGetter__("namespaceURI", function() {
  return this._namespaceURI || null;
});

core.Node.prototype.__defineSetter__("namespaceURI", function(value) {
  this._namespaceURI = value;
});

core.Node.prototype.__defineGetter__("prefix", function() {
  return this._prefix || null;
});

core.Node.prototype.__defineSetter__("prefix", function(value) {

  if (this.readonly) {
    throw new core.DOMException(core.NO_MODIFICATION_ALLOWED_ERR);
  }

  ns.validate(value, this._namespaceURI);

  if ((this._created && !this._namespaceURI)  ||
      this._prefix === "xmlns"                ||
      (!this._prefix && this._created))
  {
    throw new core.DOMException(core.NAMESPACE_ERR);
  }

  if (this._localName) {
    this._nodeName = value + ':' + this._localName;
  }

  this._prefix = value;
});

core.Node.prototype.__defineGetter__("localName", function() {
  return this._localName || null;
});

/* return boolean */
core.Node.prototype.hasAttributes = function() {
  return (this.nodeType === this.ELEMENT_NODE &&
          this._attributes                    &&
          this._attributes.length > 0);
};

core.NamedNodeMap.prototype.getNamedItemNS = function(/* string */ namespaceURI,
                                                      /* string */ localName)
{
  if (this._nsStore[namespaceURI] && this._nsStore[namespaceURI][localName]) {
    return this._nsStore[namespaceURI][localName];
  }
  return null;


  return this._map(function(item) {
    var node = null, equal = item.localName === localName;
    if (item._ownerDocument &&
        item._ownerDocument.doctype &&
        item._ownerDocument.doctype._attributes)
    {
      node = item._ownerDocument.doctype._attributes.getNamedItem(localName);
    }

    if (namespaceURI === item.namespaceURI || !namespaceURI) {
      return (equal || node) ? true : false;
    }
    return false;
  })[0] || null;
};

core.AttrNodeMap.prototype.setNamedItemNS = function(/* Node */ arg) {
  if (arg.nodeType !== this._ownerDocument.ATTRIBUTE_NODE) {
    throw new core.DOMException(core.HIERARCHY_REQUEST_ERR);
  }

  return core.NamedNodeMap.prototype.setNamedItemNS.call(this, arg);
};

core.AttrNodeMap.prototype.setNamedItem = function(/* Node */ arg) {
  if (arg.nodeType !== this._ownerDocument.ATTRIBUTE_NODE) {
    throw new core.DOMException(core.HIERARCHY_REQUEST_ERR);
  }

  return core.NamedNodeMap.prototype.setNamedItem.call(this, arg);
};


core.NamedNodeMap.prototype.setNamedItemNS = function(/* Node */ arg)
{
  if (this._readonly) {
    throw new core.DOMException(core.NO_MODIFICATION_ALLOWED_ERR);
  }

  var owner = this._ownerDocument;
  if (this._parentNode &&
      this._parentNode._parentNode &&
      this._parentNode._parentNode.nodeType === owner.ENTITY_NODE)
  {
    throw new core.DOMException(core.NO_MODIFICATION_ALLOWED_ERR);
  }

  if (this._ownerDocument !== arg.ownerDocument) {
    throw new core.DOMException(core.WRONG_DOCUMENT_ERR);
  }

  if (arg._parentNode) {
    throw new core.DOMException(core.INUSE_ATTRIBUTE_ERR);
  }

  // readonly
  if (this._readonly === true) {
    throw new core.DOMException(NO_MODIFICATION_ALLOWED_ERR);
  }


  if (!this._nsStore[arg.namespaceURI]) {
    this._nsStore[arg.namespaceURI] = {};
  }
  var existing = null;
  if (this._nsStore[arg.namespaceURI][arg.localName]) {
    var existing = this._nsStore[arg.namespaceURI][arg.localName];
  }

  this._nsStore[arg.namespaceURI][arg.localName] = arg;

  arg._specified = true;
  arg._ownerDocument = this._ownerDocument;

  return this.setNamedItem(arg);
};

core.NamedNodeMap.prototype.removeNamedItemNS = function(/*string */ namespaceURI,
                                                         /* string */ localName)
{

  if (this.readonly) {
    throw new core.DOMException(core.NO_MODIFICATION_ALLOWED_ERR);
  }


  var parent = this._parentNode,
      found = null,
      defaults,
      clone,
      defaultEl,
      defaultAttr;

  if (this._parentNode &&
      this._parentNode._parentNode &&
      this._parentNode._parentNode.nodeType === this._ownerDocument.ENTITY_NODE)
  {
    throw new core.DOMException(core.NO_MODIFICATION_ALLOWED_ERR);
  }

  if (this._nsStore[namespaceURI] &&
      this._nsStore[namespaceURI][localName])
  {
    found = this._nsStore[namespaceURI][localName];
    this.removeNamedItem(found.qualifiedName);
    delete this._nsStore[namespaceURI][localName];
  }

  if (!found) {
    throw new core.DOMException(core.NOT_FOUND_ERR);
  }

  if (parent.ownerDocument.doctype && parent.ownerDocument.doctype._attributes) {
    defaults = parent.ownerDocument.doctype._attributes;
    defaultEl = defaults.getNamedItemNS(parent._namespaceURI, parent._localName);
  }

  if (defaultEl) {
    defaultAttr = defaultEl._attributes.getNamedItemNS(namespaceURI, localName);

    if (defaultAttr) {
      clone = defaultAttr.cloneNode(true);
      clone._created               = false;
      clone._namespaceURI          = found._namespaceURI;
      clone._nodeName              = found.name;
      clone._localName             = found._localName;
      clone._prefix                = found._prefix
      this.setNamedItemNS(clone);
      clone._created               = true;
      clone._specified             = false;
    }
  }

  return found;
};

core.Attr.prototype.__defineGetter__("ownerElement", function() {
  return this._ownerElement || null;
});


core.Node.prototype._prefix = false;

core.Node.prototype.__defineSetter__("qualifiedName", function(qualifiedName) {
  ns.validate(qualifiedName, this._namespaceURI);
  qualifiedName       = qualifiedName || "";
  this._localName     = qualifiedName.split(":")[1] || null;
  this.prefix         = qualifiedName.split(":")[0] || null;
  this._nodeName = qualifiedName;
});

core.Node.prototype.__defineGetter__("qualifiedName", function() {
  return this._nodeName;
});

core.NamedNodeMap.prototype._map = function(fn) {
  var ret = [], l = this.length, i = 0, node;
  for(i; i<l; i++) {
    node = this.item(i);
    if (fn && fn(node)) {
      ret.push(node);
    }
  }
  return ret;
};

core.Element.prototype.getAttributeNS = function(/* string */ namespaceURI,
                                                 /* string */ localName)
{
  var attr =  this._attributes.getNamedItemNS(namespaceURI, localName);
  return (attr) ? attr.nodeValue : '';
};

core.Element.prototype.setAttributeNS = function(/* string */ namespaceURI,
                                                 /* string */ qualifiedName,
                                                 /* string */ value)
{
  var s       = qualifiedName.split(':'),
      local   = s.pop(),
      prefix  = s.pop() || null,
      attr;

  ns.validate(qualifiedName, namespaceURI);

  if (qualifiedName.split(':').shift() === "xml" &&
      namespaceURI !== "http://www.w3.org/XML/1998/namespace")
  {
    throw new core.DOMException(core.NAMESPACE_ERR);
  }

  if (prefix === "xmlns" && namespaceURI !== "http://www.w3.org/2000/xmlns/") {
    throw new core.DOMException(core.NAMESPACE_ERR);
  }

  if (qualifiedName.split(':').length > 1 && !namespaceURI) {
    throw new core.DOMException(core.NAMESPACE_ERR);
  }

  attr = this._attributes.getNamedItemNS(namespaceURI, local);

  if (!attr) {
    attr = this.ownerDocument.createAttributeNS(namespaceURI,
                                                qualifiedName,
                                                value);
    this._attributes.setNamedItemNS(attr);
    attr._ownerElement = this;
  }

  attr._namespaceURI = namespaceURI;
  attr._prefix    = prefix;
  attr._created = true;
  attr.value = value;
  attr._localName = local;

  return attr;
};

core.Element.prototype.removeAttributeNS = function(/* string */ namespaceURI,
                                                    /* string */ localName)
{

  if (this.readonly) {
    throw new core.DOMException(core.NO_MODIFICATION_ALLOWED_ERR);
  }

  var defaults,
      clone,
      found,
      defaultEl,
      defaultAttr,
      clone;

  if (parent.ownerDocument.doctype && parent.ownerDocument.doctype._attributes) {
    defaults = this.ownerDocument.doctype._attributes;
    defaultEl = defaults.getNamedItemNS(namespaceURI, this.localName);
  }

  if (defaultEl) {
    defaultAttr = defaultEl.getAttributeNodeNS(namespaceURI, localName);
  }

  found = this._attributes.removeNamedItemNS(namespaceURI, localName);

  if (defaultAttr) {
    clone = this.setAttributeNS(defaultAttr.namespaceURI,
                                defaultAttr.name,
                                defaultAttr.value);
    clone._specified = false;
  }

  return found;
};

core.Element.prototype.getAttributeNodeNS = function(/* string */ namespaceURI,
                                                     /* string */ localName)
{
  return this._attributes.getNamedItemNS(namespaceURI, localName);
};
core.Element.prototype._created = false;

core.Element.prototype.setAttributeNodeNS = function(/* Attr */ newAttr)
{
  if (newAttr.ownerElement) {
    throw new core.DOMException(core.INUSE_ATTRIBUTE_ERR);
  }

  var existing = null;
  try {
    existing = this._attributes.removeNamedItemNS(newAttr.namespaceURI,
                                                  newAttr.localName);
  } catch (e) { /* noop */}

  newAttr._ownerElement = this;
  return this._attributes.setNamedItemNS(newAttr) || existing;
};

core.Element.prototype.getElementsByTagNameNS = function(/* String */ namespaceURI,
                                                         /* String */ localName)
{
  var nsPrefixCache = {};

  function filterByTagName(child) {
    if (child.nodeType && child.nodeType === this.ENTITY_REFERENCE_NODE) {
      child = child._entity;
    }

    var localMatch = child.localName === localName,
        nsMatch    = child.namespaceURI === namespaceURI;

    if ((localMatch || localName === "*") &&
        (nsMatch || namespaceURI === "*"))
    {
      if (child.nodeType === child.ELEMENT_NODE) {
        return true;
      }
    }
    return false;
  }

  return new core.NodeList(this.ownerDocument || this,
                           core.mapper(this, filterByTagName));
};

core.Element.prototype.hasAttribute = function(/* string */name)
{
  if (!this._attributes) {
    return false;
  }
  return this._attributes.exists(name);
};

core.Element.prototype.hasAttributeNS = function(/* string */namespaceURI,
                                                 /* string */localName)
{
  if (this._attributes.getNamedItemNS(namespaceURI, localName)) {
    return true;
  } else if (this.hasAttribute(localName)) {
    return true;
  }
  return false;
};

core.DocumentType.prototype.__defineGetter__("publicId", function() {
  return this._publicId || "";
});

core.DocumentType.prototype.__defineGetter__("systemId", function() {
  return this._systemId || "";
});

core.DocumentType.prototype.__defineGetter__("internalSubset", function() {
  return this._internalSubset || null;
});

core.DocumentType.prototype.toString = function() {
    var dt = '<!doctype ' + this.name;
    if (this.publicId && this.systemId) {
        dt += 'public ' + this.publicId + ' ' + this.systemId;
        dt = dt.toUpperCase();
    }
    dt += '>';
    if (this.ownerDocument._fullDT) {
        dt = this.ownerDocument._fullDT;
    }
    return dt;
};

core.Document.prototype.importNode = function(/* Node */ importedNode,
                                              /* bool */ deep)
{
  if (importedNode && importedNode.nodeType) {
    if (importedNode.nodeType === this.DOCUMENT_NODE ||
        importedNode.nodeType === this.DOCUMENT_TYPE_NODE) {
      throw new core.DOMException(core.NOT_SUPPORTED_ERR);
    }
  }

  var self = this,
      newNode = importedNode.cloneNode(deep, function(a, b) {
        b._namespaceURI  = a._namespaceURI;
        b._nodeName      = a._nodeName;
        b._localName     = a._localName;
      }),
      defaults = false,
      defaultEl;

  if (this.doctype && this.doctype._attributes) {
    defaults = this.doctype._attributes;
  }

  function lastChance(el) {
    var attr, defaultEl;

    el._ownerDocument = self;
    if (el.id) {
      self._ids[el.id] = el;
    }
    if (el._attributes) {
      el._attributes._ownerDocument = self;
      for (var i=0,len=el._attributes.length; i < len; i++) {
        attr = el._attributes.item(i);
        attr._ownerDocument = self;
        attr._specified = true;
      }
    }
    if (defaults) {

      defaultEl = defaults.getNamedItemNS(el._namespaceURI,
                                          el._localName);

      // TODO: This could use some love
      if (defaultEl) {
        defaultEl._attributes._map(function(defaultAttr) {
          if (!el.hasAttributeNS(defaultAttr.namespaceURL,
                                 defaultAttr.localName))
          {
            var clone = defaultAttr.cloneNode(true);
            clone._namespaceURI = defaultAttr._namespaceURI;
            clone._prefix       = defaultAttr._prefix;
            clone._localName    = defaultAttr._localName;
            el.setAttributeNodeNS(clone);
            clone._specified = false;
          }
        });
      }
    }

  }

  if (deep) {
    core.visitTree(newNode, lastChance);
  }
  else {
    lastChance(newNode);
  }

  if (newNode.nodeType == newNode.ATTRIBUTE_NODE) {
    newNode._specified = true;
  }

  return newNode;
};

core.Document.prototype.createElementNS = function(/* string */ namespaceURI,
                                                   /* string */ qualifiedName)
{
  var parts   = qualifiedName.split(':'),
      element, prefix;

  if (parts.length > 1 && !namespaceURI) {
    throw new core.DOMException(core.NAMESPACE_ERR);
  }

  ns.validate(qualifiedName, namespaceURI);
  element = this.createElement(qualifiedName),

  element._created = false;

  element._namespaceURI = namespaceURI;
  element._nodeName = qualifiedName;
  element._localName = parts.pop();

  if (parts.length > 0) {
    prefix = parts.pop();
    element.prefix = prefix;
  }

  element._created = true;
  return element;
};

core.Document.prototype.createAttributeNS = function(/* string */ namespaceURI,
                                                     /* string */ qualifiedName)
{
  var attribute, parts = qualifiedName.split(':');

  if (parts.length > 1 && !namespaceURI) {
    throw new core.DOMException(core.NAMESPACE_ERR,
                                "Prefix specified without namespaceURI (" + qualifiedName + ")");
  }


  ns.validate(qualifiedName, namespaceURI);

  attribute = this.createAttribute(qualifiedName);
  attribute.namespaceURI = namespaceURI;
  attribute.qualifiedName = qualifiedName;

  attribute._localName = parts.pop();
  attribute._prefix = (parts.length > 0) ? parts.pop() : null;
  return attribute;
};

core.Document.prototype.getElementsByTagNameNS = function(/* String */ namespaceURI,
                                                          /* String */ localName)
{
  return core.Element.prototype.getElementsByTagNameNS.call(this,
                                                            namespaceURI,
                                                            localName);
};

core.Element.prototype.__defineSetter__("id", function(id) {
  this.setAttribute("id", id);
  id = this.getAttribute("id"); //Passed validation
  if (!this._ownerDocument._ids) {
      this._ownerDocument._ids = {};
  }
  if (id === '') {
      delete this._ownerDocument._ids[id];
  } else {
      this._ownerDocument._ids[id] = this;
  }
});

core.Element.prototype.__defineGetter__("id",function() {
  return this.getAttribute("id");
});

core.Document.prototype.getElementById = function(id) {
  return this._ids[id] || null;
};


exports.dom =
{
  level2 : {
    core : core
  }
};
