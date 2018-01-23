//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
//     中文注释 by hanzichi @https://github.com/hanzichi
//     我的源码解读顺序（跟系列解读文章相对应）
//     Object -> Array -> Collection -> Function -> Utility

(function() {

    // Baseline setup
    // 基本设置、配置
    // --------------
  
    // Establish the root object, `window` in the browser, or `exports` on the server.
    // 将 this 赋值给局部变量 root
    // root 的值, 客户端为 `window`, 服务端(node) 中为 `exports`
    var root = this;
  
    // Save the previous value of the `_` variable.
    // 将原来全局环境中的变量 `_` 赋值给变量 previousUnderscore 进行缓存
    // 在后面的 noConflict 方法中有用到
    var previousUnderscore = root._;
  
    // Save bytes in the minified (but not gzipped) version:
    // 缓存变量, 便于压缩代码
    // 此处「压缩」指的是压缩到 min.js 版本
    // 而不是 gzip 压缩
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
  
    // Create quick reference variables for speed access to core prototypes.
    // 缓存变量, 便于压缩代码
    // 同时可减少在原型链中的查找次数(提高代码效率)
    var
      push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;
  
    // All **ECMAScript 5** native function implementations that we hope to use
    // are declared here.
    // ES5 原生方法, 如果浏览器支持, 则 underscore 中会优先使用
    var
      nativeIsArray      = Array.isArray,
      nativeKeys         = Object.keys,
      nativeBind         = FuncProto.bind,
      nativeCreate       = Object.create;
  
    // Naked function reference for surrogate-prototype-swapping.
    var Ctor = function(){};
  
    // Create a safe reference to the Underscore object for use below.
    // 核心函数
    // `_` 其实是一个构造函数
    // 支持无 new 调用的构造函数（思考 jQuery 的无 new 调用）
    // 将传入的参数（实际要操作的数据）赋值给 this._wrapped 属性
    // OOP 调用时，_ 相当于一个构造函数
    // each 等方法都在该构造函数的原型链上
    // _([1, 2, 3]).each(alert)
    // _([1, 2, 3]) 相当于无 new 构造了一个新的对象
    // 调用了该对象的 each 方法，该方法在该对象构造函数的原型链上
    var _ = function(obj) {
      // 以下均针对 OOP 形式的调用
      // 如果是非 OOP 形式的调用，不会进入该函数内部
  
      // 如果 obj 已经是 `_` 函数的实例，则直接返回 obj
      if (obj instanceof _)
        return obj;
  
      // 如果不是 `_` 函数的实例
      // 则调用 new 运算符，返回实例化的对象
      if (!(this instanceof _))
        return new _(obj);
  
      // 将 obj 赋值给 this._wrapped 属性
      this._wrapped = obj;
    };
  
    // Export the Underscore object for **Node.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `_` as a global object.
    // 将上面定义的 `_` 局部变量赋值给全局对象中的 `_` 属性
    // 即客户端中 window._ = _
    // 服务端(node)中 exports._ = _
    // 同时在服务端向后兼容老的 require() API
    // 这样暴露给全局后便可以在全局环境中使用 `_` 变量(方法)
    if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = _;
      }
      exports._ = _;
    } else {
      root._ = _;
    }
  
    // Current version.
    // 当前 underscore 版本号
    _.VERSION = '1.8.3';
  
    // Internal function that returns an efficient (for current engines) version
    // of the passed-in callback, to be repeatedly applied in other Underscore
    // functions.
    // underscore 内部方法
    // 根据 this 指向（context 参数）
    // 以及 argCount 参数
    // 二次操作返回一些回调、迭代方法
    var optimizeCb = function(func, context, argCount) {
      // 如果没有指定 this 指向，则返回原函数
      if (context === void 0)
        return func;
  
      switch (argCount == null ? 3 : argCount) {
        case 1: return function(value) {
          return func.call(context, value);
        };
        case 2: return function(value, other) {
          return func.call(context, value, other);
        };
  
        // 如果有指定 this，但没有传入 argCount 参数
        // 则执行以下 case
        // _.each、_.map
        case 3: return function(value, index, collection) {
          return func.call(context, value, index, collection);
        };
  
        // _.reduce、_.reduceRight
        case 4: return function(accumulator, value, index, collection) {
          return func.call(context, accumulator, value, index, collection);
        };
      }
  
      // 其实不用上面的 switch-case 语句
      // 直接执行下面的 return 函数就行了
      // 不这样做的原因是 call 比 apply 快很多
      // .apply 在运行前要对作为参数的数组进行一系列检验和深拷贝，.call 则没有这些步骤
      // 具体可以参考：
      // https://segmentfault.com/q/1010000007894513
      // http://www.ecma-international.org/ecma-262/5.1/#sec-15.3.4.3
      // http://www.ecma-international.org/ecma-262/5.1/#sec-15.3.4.4
      return function() {
        return func.apply(context, arguments);
      };
    };
  
    // A mostly-internal function to generate callbacks that can be applied
    // to each element in a collection, returning the desired result — either
    // identity, an arbitrary callback, a property matcher, or a property accessor.
    var cb = function(value, context, argCount) {
      if (value == null) return _.identity;
      if (_.isFunction(value)) return optimizeCb(value, context, argCount);
      if (_.isObject(value)) return _.matcher(value);
      return _.property(value);
    };
  
    _.iteratee = function(value, context) {
      return cb(value, context, Infinity);
    };
  
    // An internal function for creating assigner functions.
    // 有三个方法用到了这个内部函数
    // _.extend & _.extendOwn & _.defaults
    // _.extend = createAssigner(_.allKeys);
    // _.extendOwn = _.assign = createAssigner(_.keys);
    // _.defaults = createAssigner(_.allKeys, true);
    var createAssigner = function(keysFunc, undefinedOnly) {
      // 返回函数
      // 经典闭包（undefinedOnly 参数在返回的函数中被引用）
      // 返回的函数参数个数 >= 1
      // 将第二个开始的对象参数的键值对 "继承" 给第一个参数
      return function(obj) {
        var length = arguments.length;
        // 只传入了一个参数（或者 0 个？）
        // 或者传入的第一个参数是 null
        if (length < 2 || obj == null) return obj;
  
        // 枚举第一个参数除外的对象参数
        // 即 arguments[1], arguments[2] ...
        for (var index = 1; index < length; index++) {
          // source 即为对象参数
          var source = arguments[index],
              // 提取对象参数的 keys 值
              // keysFunc 参数表示 _.keys
              // 或者 _.allKeys
              keys = keysFunc(source),
              l = keys.length;
  
          // 遍历该对象的键值对
          for (var i = 0; i < l; i++) {
            var key = keys[i];
            // _.extend 和 _.extendOwn 方法
            // 没有传入 undefinedOnly 参数，即 !undefinedOnly 为 true
            // 即肯定会执行 obj[key] = source[key]
            // 后面对象的键值对直接覆盖 obj
            // ==========================================
            // _.defaults 方法，undefinedOnly 参数为 true
            // 即 !undefinedOnly 为 false
            // 那么当且仅当 obj[key] 为 undefined 时才覆盖
            // 即如果有相同的 key 值，取最早出现的 value 值
            // *defaults 中有相同 key 的也是一样取首次出现的
            if (!undefinedOnly || obj[key] === void 0)
              obj[key] = source[key];
          }
        }
  
        // 返回已经继承后面对象参数属性的第一个参数对象
        return obj;
      };
    };
  
    // An internal function for creating a new object that inherits from another.
    // use in `_.create`
    var baseCreate = function(prototype) {
      // 如果 prototype 参数不是对象
      if (!_.isObject(prototype)) return {};
  
      // 如果浏览器支持 ES5 Object.create
      if (nativeCreate) return nativeCreate(prototype);
  
      Ctor.prototype = prototype;
      var result = new Ctor;
      Ctor.prototype = null;
      return result;
    };
  
    // 闭包
    var property = function(key) {
      return function(obj) {
        return obj == null ? void 0 : obj[key];
      };
    };
  
    // Helper for collection methods to determine whether a collection
    // should be iterated as an array or as an object
    // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
    // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  
    // Math.pow(2, 53) - 1 是 JavaScript 中能精确表示的最大数字
    var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  
    // getLength 函数
    // 该函数传入一个参数，返回参数的 length 属性值
    // 用来获取 array 以及 arrayLike 元素的 length 属性值
    var getLength = property('length');
  
    // 判断是否是 ArrayLike Object
    // 类数组，即拥有 length 属性并且 length 属性值为 Number 类型的元素
    // 包括数组、arguments、HTML Collection 以及 NodeList 等等
    // 包括类似 {length: 10} 这样的对象
    // 包括字符串、函数等
    var isArrayLike = function(collection) {
      // 返回参数 collection 的 length 属性值
      var length = getLength(collection);
      return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
    };
  
  
    // Collection Functions
    // 数组或者对象的扩展方法
    // 共 25 个扩展方法
    // --------------------
  
    // The cornerstone, an `each` implementation, aka `forEach`.
    // Handles raw objects in addition to array-likes. Treats all
    // sparse array-likes as if they were dense.
    // 与 ES5 中 Array.prototype.forEach 使用方法类似
    // 遍历数组或者对象的每个元素
    // 第一个参数为数组（包括类数组）或者对象
    // 第二个参数为迭代方法，对数组或者对象每个元素都执行该方法
    // 该方法又能传入三个参数，分别为 (item, index, array)（(value, key, obj) for object）
    // 与 ES5 中 Array.prototype.forEach 方法传参格式一致
    // 第三个参数（可省略）确定第二个参数 iteratee 函数中的（可能有的）this 指向
    // 即 iteratee 中出现的（如果有）所有 this 都指向 context
    // notice: 不要传入一个带有 key 类型为 number 的对象！
    // notice: _.each 方法不能用 return 跳出循环（同样，Array.prototype.forEach 也不行）
    _.each = _.forEach = function(obj, iteratee, context) {
      // 根据 context 确定不同的迭代函数
      iteratee = optimizeCb(iteratee, context);
  
      var i, length;
  
      // 如果是类数组
      // 默认不会传入类似 {length: 10} 这样的数据
      if (isArrayLike(obj)) {
        // 遍历
        for (i = 0, length = obj.length; i < length; i++) {
          iteratee(obj[i], i, obj);
        }
      } else { // 如果 obj 是对象
        // 获取对象的所有 key 值
        var keys = _.keys(obj);
  
        // 如果是对象，则遍历处理 values 值
        for (i = 0, length = keys.length; i < length; i++) {
          iteratee(obj[keys[i]], keys[i], obj); // (value, key, obj)
        }
      }
  
      // 返回 obj 参数
      // 供链式调用（Returns the list for chaining）
      // 应该仅 OOP 调用有效
      return obj;
    };
  
    // Return the results of applying the iteratee to each element.
    // 与 ES5 中 Array.prototype.map 使用方法类似
    // 传参形式与 _.each 方法类似
    // 遍历数组（每个元素）或者对象的每个元素（value）
    // 对每个元素执行 iteratee 迭代方法
    // 将结果保存到新的数组中，并返回
    _.map = _.collect = function(obj, iteratee, context) {
      // 根据 context 确定不同的迭代函数
      iteratee = cb(iteratee, context);
  
      // 如果传参是对象，则获取它的 keys 值数组（短路表达式）
      var keys = !isArrayLike(obj) && _.keys(obj),
          // 如果 obj 为对象，则 length 为 key.length
          // 如果 obj 为数组，则 length 为 obj.length
          length = (keys || obj).length,
          results = Array(length); // 结果数组
  
      // 遍历
      for (var index = 0; index < length; index++) {
        // 如果 obj 为对象，则 currentKey 为对象键值 key
        // 如果 obj 为数组，则 currentKey 为 index 值
        var currentKey = keys ? keys[index] : index;
        results[index] = iteratee(obj[currentKey], currentKey, obj);
      }
  
      // 返回新的结果数组
      return results;
    };
  
    // Create a reducing function iterating left or right.
    // dir === 1 -> _.reduce
    // dir === -1 -> _.reduceRight
    function createReduce(dir) {
      // Optimized iterator function as using arguments.length
      // in the main function will deoptimize the, see #1991.
      function iterator(obj, iteratee, memo, keys, index, length) {
        for (; index >= 0 && index < length; index += dir) {
          var currentKey = keys ? keys[index] : index;
          // 迭代，返回值供下次迭代调用
          memo = iteratee(memo, obj[currentKey], currentKey, obj);
        }
        // 每次迭代返回值，供下次迭代调用
        return memo;
      }
  
      // _.reduce（_.reduceRight）可传入的 4 个参数
      // obj 数组或者对象
      // iteratee 迭代方法，对数组或者对象每个元素执行该方法
      // memo 初始值，如果有，则从 obj 第一个元素开始迭代
      // 如果没有，则从 obj 第二个元素开始迭代，将第一个元素作为初始值
      // context 为迭代函数中的 this 指向
      return function(obj, iteratee, memo, context) {
        iteratee = optimizeCb(iteratee, context, 4);
        var keys = !isArrayLike(obj) && _.keys(obj),
            length = (keys || obj).length,
            index = dir > 0 ? 0 : length - 1;
  
        // Determine the initial value if none is provided.
        // 如果没有指定初始值
        // 则把第一个元素指定为初始值
        if (arguments.length < 3) {
          memo = obj[keys ? keys[index] : index];
          // 根据 dir 确定是向左还是向右遍历
          index += dir;
        }
  
        return iterator(obj, iteratee, memo, keys, index, length);
      };
    }
  
    // **Reduce** builds up a single result from a list of values, aka `inject`,
    // or `foldl`.
    // 与 ES5 中 Array.prototype.reduce 使用方法类似
    // _.reduce(list, iteratee, [memo], [context])
    // _.reduce 方法最多可传入 4 个参数
    // memo 为初始值，可选
    // context 为指定 iteratee 中 this 指向，可选
    _.reduce = _.foldl = _.inject = createReduce(1);
  
    // The right-associative version of reduce, also known as `foldr`.
    // 与 ES5 中 Array.prototype.reduceRight 使用方法类似
    _.reduceRight = _.foldr = createReduce(-1);
  
    // Return the first value which passes a truth test. Aliased as `detect`.
    // 寻找数组或者对象中第一个满足条件（predicate 函数返回 true）的元素
    // 并返回该元素值
    // _.find(list, predicate, [context])
    _.find = _.detect = function(obj, predicate, context) {
      var key;
      // 如果 obj 是数组，key 为满足条件的下标
      if (isArrayLike(obj)) {
        key = _.findIndex(obj, predicate, context);
      } else {
        // 如果 obj 是对象，key 为满足条件的元素的 key 值
        key = _.findKey(obj, predicate, context);
      }
  
      // 如果该元素存在，则返回该元素
      // 如果不存在，则默认返回 undefined（函数没有返回，即返回 undefined）
      if (key !== void 0 && key !== -1) return obj[key];
    };
  
    // Return all the elements that pass a truth test.
    // Aliased as `select`.
    // 与 ES5 中 Array.prototype.filter 使用方法类似
    // 寻找数组或者对象中所有满足条件的元素
    // 如果是数组，则将 `元素值` 存入数组
    // 如果是对象，则将 `value 值` 存入数组
    // 返回该数组
    // _.filter(list, predicate, [context])
    _.filter = _.select = function(obj, predicate, context) {
      var results = [];
  
      // 根据 this 指向，返回 predicate 函数（判断函数）
      predicate = cb(predicate, context);
  
      // 遍历每个元素，如果符合条件则存入数组
      _.each(obj, function(value, index, list) {
        if (predicate(value, index, list)) results.push(value);
      });
  
      return results;
    };
  
    // Return all the elements for which a truth test fails.
    // 寻找数组或者对象中所有不满足条件的元素
    // 并以数组方式返回
    // 所得结果是 _.filter 方法的补集
    _.reject = function(obj, predicate, context) {
      return _.filter(obj, _.negate(cb(predicate)), context);
    };
  
    // Determine whether all of the elements match a truth test.
    // Aliased as `all`.
    // 与 ES5 中的 Array.prototype.every 方法类似
    // 判断数组中的每个元素或者对象中每个 value 值是否都满足 predicate 函数中的判断条件
    // 如果是，则返回 ture；否则返回 false（有一个不满足就返回 false）
    // _.every(list, [predicate], [context])
    _.every = _.all = function(obj, predicate, context) {
      // 根据 this 指向，返回相应 predicate 函数
      predicate = cb(predicate, context);
  
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length;
  
      for (var index = 0; index < length; index++) {
        var currentKey = keys ? keys[index] : index;
        // 如果有一个不能满足 predicate 中的条件
        // 则返回 false
        if (!predicate(obj[currentKey], currentKey, obj))
          return false;
      }
  
      return true;
    };
  
    // Determine if at least one element in the object matches a truth test.
    // Aliased as `any`.
    // 与 ES5 中 Array.prototype.some 方法类似
    // 判断数组或者对象中是否有一个元素（value 值 for object）满足 predicate 函数中的条件
    // 如果是则返回 true；否则返回 false
    // _.some(list, [predicate], [context])
    _.some = _.any = function(obj, predicate, context) {
      // 根据 context 返回 predicate 函数
      predicate = cb(predicate, context);
      // 如果传参是对象，则返回该对象的 keys 数组
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length;
      for (var index = 0; index < length; index++) {
        var currentKey = keys ? keys[index] : index;
        // 如果有一个元素满足条件，则返回 true
        if (predicate(obj[currentKey], currentKey, obj)) return true;
      }
      return false;
    };
  
    // Determine if the array or object contains a given item (using `===`).
    // Aliased as `includes` and `include`.
    // 判断数组或者对象中（value 值）是否有指定元素
    // 如果是 object，则忽略 key 值，只需要查找 value 值即可
    // 即该 obj 中是否有指定的 value 值
    // 返回布尔值
    _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
      // 如果是对象，返回 values 组成的数组
      if (!isArrayLike(obj)) obj = _.values(obj);
  
      // fromIndex 表示查询起始位置
      // 如果没有指定该参数，则默认从头找起
      if (typeof fromIndex != 'number' || guard) fromIndex = 0;
  
      // _.indexOf 是数组的扩展方法（Array Functions）
      // 数组中寻找某一元素
      return _.indexOf(obj, item, fromIndex) >= 0;
    };
  
    // Invoke a method (with arguments) on every item in a collection.
    // Calls the method named by methodName on each value in the list.
    // Any extra arguments passed to invoke will be forwarded on to the method invocation.
    // 数组或者对象中的每个元素都调用 method 方法
    // 返回调用后的结果（数组或者关联数组）
    // method 参数后的参数会被当做参数传入 method 方法中
    // _.invoke(list, methodName, *arguments)
    _.invoke = function(obj, method) {
      // *arguments 参数
      var args = slice.call(arguments, 2);
  
      // 判断 method 是不是函数
      var isFunc = _.isFunction(method);
  
      // 用 map 方法对数组或者对象每个元素调用方法
      // 返回数组
      return _.map(obj, function(value) {
        // 如果 method 不是函数，则可能是 obj 的 key 值
        // 而 obj[method] 可能为函数
        var func = isFunc ? method : value[method];
        return func == null ? func : func.apply(value, args);
      });
    };
  
    // Convenience version of a common use case of `map`: fetching a property.
    // 一个数组，元素都是对象
    // 根据指定的 key 值
    // 返回一个数组，元素都是指定 key 值的 value 值
    /*
    var property = function(key) {
      return function(obj) {
        return obj == null ? void 0 : obj[key];
      };
    };
    */
    // _.pluck(list, propertyName)
    _.pluck = function(obj, key) {
      return _.map(obj, _.property(key));
    };
  
    // Convenience version of a common use case of `filter`: selecting only objects
    // containing specific `key:value` pairs.
    // 根据指定的键值对
    // 选择对象
    _.where = function(obj, attrs) {
      return _.filter(obj, _.matcher(attrs));
    };
  
    // Convenience version of a common use case of `find`: getting the first object
    // containing specific `key:value` pairs.
    // 寻找第一个有指定 key-value 键值对的对象
    _.findWhere = function(obj, attrs) {
      return _.find(obj, _.matcher(attrs));
    };
  
    // Return the maximum element (or element-based computation).
    // 寻找数组中的最大元素
    // 或者对象中的最大 value 值
    // 如果有 iteratee 参数，则求每个元素经过该函数迭代后的最值
    // _.max(list, [iteratee], [context])
    _.max = function(obj, iteratee, context) {
      var result = -Infinity, lastComputed = -Infinity,
          value, computed;
  
      // 单纯地寻找最值
      if (iteratee == null && obj != null) {
        // 如果是数组，则寻找数组中最大元素
        // 如果是对象，则寻找最大 value 值
        obj = isArrayLike(obj) ? obj : _.values(obj);
  
        for (var i = 0, length = obj.length; i < length; i++) {
          value = obj[i];
          if (value > result) {
            result = value;
          }
        }
      } else {  // 寻找元素经过迭代后的最值
        iteratee = cb(iteratee, context);
  
        // result 保存结果元素
        // lastComputed 保存计算过程中出现的最值
        // 遍历元素
        _.each(obj, function(value, index, list) {
          // 经过迭代函数后的值
          computed = iteratee(value, index, list);
          // && 的优先级高于 ||
          if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
            result = value;
            lastComputed = computed;
          }
        });
      }
  
      return result;
    };
  
    // Return the minimum element (or element-based computation).
    // 寻找最小的元素
    // 类似 _.max
    // _.min(list, [iteratee], [context])
    _.min = function(obj, iteratee, context) {
      var result = Infinity, lastComputed = Infinity,
          value, computed;
      if (iteratee == null && obj != null) {
        obj = isArrayLike(obj) ? obj : _.values(obj);
        for (var i = 0, length = obj.length; i < length; i++) {
          value = obj[i];
          if (value < result) {
            result = value;
          }
        }
      } else {
        iteratee = cb(iteratee, context);
        _.each(obj, function(value, index, list) {
          computed = iteratee(value, index, list);
          if (computed < lastComputed || computed === Infinity && result === Infinity) {
            result = value;
            lastComputed = computed;
          }
        });
      }
      return result;
    };
  
    // Shuffle a collection, using the modern version of the
    // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
    // 将数组乱序
    // 如果是对象，则返回一个数组，数组由对象 value 值构成
    // Fisher-Yates shuffle 算法
    // 最优的洗牌算法，复杂度 O(n)
    // 乱序不要用 sort + Math.random()，复杂度 O(nlogn)
    // 而且，并不是真正的乱序
    // @see https://github.com/hanzichi/underscore-analysis/issues/15
    _.shuffle = function(obj) {
      // 如果是对象，则对 value 值进行乱序
      var set = isArrayLike(obj) ? obj : _.values(obj);
      var length = set.length;
  
      // 乱序后返回的数组副本（参数是对象则返回乱序后的 value 数组）
      var shuffled = Array(length);
  
      // 枚举元素
      for (var index = 0, rand; index < length; index++) {
        // 将当前所枚举位置的元素和 `index=rand` 位置的元素交换
        rand = _.random(0, index);
        if (rand !== index) shuffled[index] = shuffled[rand];
        shuffled[rand] = set[index];
      }
  
      return shuffled;
    };
  
    // Sample **n** random values from a collection.
    // If **n** is not specified, returns a single random element.
    // The internal `guard` argument allows it to work with `map`.
    // 随机返回数组或者对象中的一个元素
    // 如果指定了参数 `n`，则随机返回 n 个元素组成的数组
    // 如果参数是对象，则数组由 values 组成
    _.sample = function(obj, n, guard) {
      // 随机返回一个元素
      if (n == null || guard) {
        if (!isArrayLike(obj)) obj = _.values(obj);
        return obj[_.random(obj.length - 1)];
      }
  
      // 随机返回 n 个
      return _.shuffle(obj).slice(0, Math.max(0, n));
    };
  
    // Sort the object's values by a criterion produced by an iteratee.
    // 排序
    // _.sortBy(list, iteratee, [context])
    _.sortBy = function(obj, iteratee, context) {
      iteratee = cb(iteratee, context);
  
      // 根据指定的 key 返回 values 数组
      // _.pluck([{}, {}, {}], 'value')
      return _.pluck(
        // _.map(obj, function(){}).sort()
        // _.map 后的结果 [{}, {}..]
        // sort 后的结果 [{}, {}..]
        _.map(obj, function(value, index, list) {
          return {
            value: value,
            index: index,
            // 元素经过迭代函数迭代后的值
            criteria: iteratee(value, index, list)
          };
        }).sort(function(left, right) {
        var a = left.criteria;
        var b = right.criteria;
        if (a !== b) {
          if (a > b || a === void 0) return 1;
          if (a < b || b === void 0) return -1;
        }
        return left.index - right.index;
      }), 'value');
  
    };
  
    // An internal function used for aggregate "group by" operations.
    // behavior 是一个函数参数
    // _.groupBy, _.indexBy 以及 _.countBy 其实都是对数组元素进行分类
    // 分类规则就是 behavior 函数
    var group = function(behavior) {
      return function(obj, iteratee, context) {
        // 返回结果是一个对象
        var result = {};
        iteratee = cb(iteratee, context);
        // 遍历元素
        _.each(obj, function(value, index) {
          // 经过迭代，获取结果值，存为 key
          var key = iteratee(value, index, obj);
          // 按照不同的规则进行分组操作
          // 将变量 result 当做参数传入，能在 behavior 中改变该值
          behavior(result, value, key);
        });
        // 返回结果对象
        return result;
      };
    };
  
    // Groups the object's values by a criterion. Pass either a string attribute
    // to group by, or a function that returns the criterion.
    // groupBy_  _.groupBy(list, iteratee, [context])
    // 根据特定规则对数组或者对象中的元素进行分组
    // result 是返回对象
    // value 是数组元素
    // key 是迭代后的值
    _.groupBy = group(function(result, value, key) {
      // 根据 key 值分组
      // key 是元素经过迭代函数后的值
      // 或者元素自身的属性值
  
      // result 对象已经有该 key 值了
      if (_.has(result, key))
        result[key].push(value);
      else result[key] = [value];
    });
  
    // Indexes the object's values by a criterion, similar to `groupBy`, but for
    // when you know that your index values will be unique.
    _.indexBy = group(function(result, value, key) {
      // key 值必须是独一无二的
      // 不然后面的会覆盖前面的
      // 其他和 _.groupBy 类似
      result[key] = value;
    });
  
    // Counts instances of an object that group by a certain criterion. Pass
    // either a string attribute to count by, or a function that returns the
    // criterion.
    _.countBy = group(function(result, value, key) {
      // 不同 key 值元素数量
      if (_.has(result, key))
        result[key]++;
      else result[key] = 1;
    });
  
    // Safely create a real, live array from anything iterable.
    // 伪数组 -> 数组
    // 对象 -> 提取 value 值组成数组
    // 返回数组
    _.toArray = function(obj) {
      if (!obj) return [];
  
      // 如果是数组，则返回副本数组
      // 是否用 obj.concat() 更方便？
      if (_.isArray(obj)) return slice.call(obj);
  
      // 如果是类数组，则重新构造新的数组
      // 是否也可以直接用 slice 方法？
      if (isArrayLike(obj)) return _.map(obj, _.identity);
  
      // 如果是对象，则返回 values 集合
      return _.values(obj);
    };
  
    // Return the number of elements in an object.
    // 如果是数组（类数组），返回长度（length 属性）
    // 如果是对象，返回键值对数量
    _.size = function(obj) {
      if (obj == null) return 0;
      return isArrayLike(obj) ? obj.length : _.keys(obj).length;
    };
  
    // Split a collection into two arrays: one whose elements all satisfy the given
    // predicate, and one whose elements all do not satisfy the predicate.
    // 将数组或者对象中符合条件（predicate）的元素
    // 和不符合条件的元素（数组为元素，对象为 value 值）
    // 分别放入两个数组中
    // 返回一个数组，数组元素为以上两个数组（[[pass array], [fail array]]）
    _.partition = function(obj, predicate, context) {
      predicate = cb(predicate, context);
      var pass = [], fail = [];
      _.each(obj, function(value, key, obj) {
        (predicate(value, key, obj) ? pass : fail).push(value);
      });
      return [pass, fail];
    };
  
  
    // Array Functions
    // 数组的扩展方法
    // 共 20 个扩展方法
    // Note: All array functions will also work on the arguments object.
    // However, Underscore functions are not designed to work on "sparse" arrays.
    // ---------------
  
    // Get the first element of an array. Passing **n** will return the first N
    // values in the array. Aliased as `head` and `take`. The **guard** check
    // allows it to work with `_.map`.
    // 返回数组第一个元素
    // 如果有参数 n，则返回数组前 n 个元素（组成的数组）
    _.first = _.head = _.take = function(array, n, guard) {
      // 容错，数组为空则返回 undefined
      if (array == null) return void 0;
  
      // 没指定参数 n，则默认返回第一个元素
      if (n == null || guard) return array[0];
  
      // 如果传入参数 n，则返回前 n 个元素组成的数组
      // 返回前 n 个元素，即剔除后 array.length - n 个元素
      return _.initial(array, array.length - n);
    };
  
    // Returns everything but the last entry of the array. Especially useful on
    // the arguments object. Passing **n** will return all the values in
    // the array, excluding the last N.
    // 传入一个数组
    // 返回剔除最后一个元素之后的数组副本
    // 如果传入参数 n，则剔除最后 n 个元素
    _.initial = function(array, n, guard) {
      return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
    };
  
    // Get the last element of an array. Passing **n** will return the last N
    // values in the array.
    // 返回数组最后一个元素
    // 如果传入参数 n
    // 则返回该数组后 n 个元素组成的数组
    // 即剔除前 array.length - n 个元素
    _.last = function(array, n, guard) {
      // 容错
      if (array == null) return void 0;
  
      // 如果没有指定参数 n，则返回最后一个元素
      if (n == null || guard) return array[array.length - 1];
  
      // 如果传入参数 n，则返回后 n 个元素组成的数组
      // 即剔除前 array.length - n 个元素
      return _.rest(array, Math.max(0, array.length - n));
    };
  
    // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
    // Especially useful on the arguments object. Passing an **n** will return
    // the rest N values in the array.
    // 传入一个数组
    // 返回剔除第一个元素后的数组副本
    // 如果传入参数 n，则剔除前 n 个元素
    _.rest = _.tail = _.drop = function(array, n, guard) {
      return slice.call(array, n == null || guard ? 1 : n);
    };
  
    // Trim out all falsy values from an array.
    // 去掉数组中所有的假值
    // 返回数组副本
    // JavaScript 中的假值包括 false、null、undefined、''、NaN、0
    // 联想 PHP 中的 array_filter() 函数
    // _.identity = function(value) {
    //   return value;
    // };
    _.compact = function(array) {
      return _.filter(array, _.identity);
    };
  
    // Internal implementation of a recursive `flatten` function.
    // 递归调用数组，将数组展开
    // 即 [1, 2, [3, 4]] => [1, 2, 3, 4]
    // flatten(array, shallow, false)
    // flatten(arguments, true, true, 1)
    // flatten(arguments, true, true)
    // flatten(arguments, false, false, 1)
    // ===== //
    // input => Array 或者 arguments
    // shallow => 是否只展开一层
    // strict === true，通常和 shallow === true 配合使用
    // 表示只展开一层，但是不保存非数组元素（即无法展开的基础类型）
    // flatten([[1, 2], 3, 4], true, true) => [1, 2]
    // flatten([[1, 2], 3, 4], false, true) = > []
    // startIndex => 从 input 的第几项开始展开
    // ===== //
    // 可以看到，如果 strict 参数为 true，那么 shallow 也为 true
    // 也就是展开一层，同时把非数组过滤
    // [[1, 2], [3, 4], 5, 6] => [1, 2, 3, 4]
    var flatten = function(input, shallow, strict, startIndex) {
      // output 数组保存结果
      // 即 flatten 方法返回数据
      // idx 为 output 的累计数组下标
      var output = [], idx = 0;
  
      // 根据 startIndex 变量确定需要展开的起始位置
      for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
        var value = input[i];
        // 数组 或者 arguments
        // 注意 isArrayLike 还包括 {length: 10} 这样的，过滤掉
        if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
          // flatten current level of array or arguments object
          // (!shallow === true) => (shallow === false)
          // 则表示需深度展开
          // 继续递归展开
          if (!shallow)
            // flatten 方法返回数组
            // 将上面定义的 value 重新赋值
            value = flatten(value, shallow, strict);
  
          // 递归展开到最后一层（没有嵌套的数组了）
          // 或者 (shallow === true) => 只展开一层
          // value 值肯定是一个数组
          var j = 0, len = value.length;
  
          // 这一步貌似没有必要
          // 毕竟 JavaScript 的数组会自动扩充
          // 但是这样写，感觉比较好，对于元素的 push 过程有个比较清晰的认识
          output.length += len;
  
          // 将 value 数组的元素添加到 output 数组中
          while (j < len) {
            output[idx++] = value[j++];
          }
        } else if (!strict) {
          // (!strict === true) => (strict === false)
          // 如果是深度展开，即 shallow 参数为 false
          // 那么当最后 value 不是数组，是基本类型时
          // 肯定会走到这个 else-if 判断中
          // 而如果此时 strict 为 true，则不能跳到这个分支内部
          // 所以 shallow === false 如果和 strict === true 搭配
          // 调用 flatten 方法得到的结果永远是空数组 []
          output[idx++] = value;
        }
      }
  
      return output;
    };
  
    // Flatten out an array, either recursively (by default), or just one level.
    // 将嵌套的数组展开
    // 如果参数 (shallow === true)，则仅展开一层
    // _.flatten([1, [2], [3, [[4]]]]);
    // => [1, 2, 3, 4];
    // ====== //
    // _.flatten([1, [2], [3, [[4]]]], true);
    // => [1, 2, 3, [[4]]];
    _.flatten = function(array, shallow) {
      // array => 需要展开的数组
      // shallow => 是否只展开一层
      // false 为 flatten 方法 strict 变量
      return flatten(array, shallow, false);
    };
  
    // Return a version of the array that does not contain the specified value(s).
    // without_.without(array, *values)
    // Returns a copy of the array with all instances of the values removed.
    // ====== //
    // _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
    // => [2, 3, 4]
    // ===== //
    // 从数组中移除指定的元素
    // 返回移除后的数组副本
    _.without = function(array) {
      // slice.call(arguments, 1)
      // 将 arguments 转为数组（同时去掉第一个元素）
      // 之后便可以调用 _.difference 方法
      return _.difference(array, slice.call(arguments, 1));
    };
  
    // Produce a duplicate-free version of the array. If the array has already
    // been sorted, you have the option of using a faster algorithm.
    // Aliased as `unique`.
    // 数组去重
    // 如果第二个参数 `isSorted` 为 true
    // 则说明事先已经知道数组有序
    // 程序会跑一个更快的算法（一次线性比较，元素和数组前一个元素比较即可）
    // 如果有第三个参数 iteratee，则对数组每个元素迭代
    // 对迭代之后的结果进行去重
    // 返回去重后的数组（array 的子数组）
    // PS: 暴露的 API 中没 context 参数
    // _.uniq(array, [isSorted], [iteratee])
    _.uniq = _.unique = function(array, isSorted, iteratee, context) {
      // 没有传入 isSorted 参数
      // 转为 _.unique(array, false, undefined, iteratee)
      if (!_.isBoolean(isSorted)) {
        context = iteratee;
        iteratee = isSorted;
        isSorted = false;
      }
  
      // 如果有迭代函数
      // 则根据 this 指向二次返回新的迭代函数
      if (iteratee != null)
        iteratee = cb(iteratee, context);
  
      // 结果数组，是 array 的子集
      var result = [];
  
      // 已经出现过的元素（或者经过迭代过的值）
      // 用来过滤重复值
      var seen = [];
  
      for (var i = 0, length = getLength(array); i < length; i++) {
        var value = array[i],
            // 如果指定了迭代函数
            // 则对数组每一个元素进行迭代
            // 迭代函数传入的三个参数通常是 value, index, array 形式
            computed = iteratee ? iteratee(value, i, array) : value;
  
        // 如果是有序数组，则当前元素只需跟上一个元素对比即可
        // 用 seen 变量保存上一个元素
        if (isSorted) {
          // 如果 i === 0，是第一个元素，则直接 push
          // 否则比较当前元素是否和前一个元素相等
          if (!i || seen !== computed) result.push(value);
          // seen 保存当前元素，供下一次对比
          seen = computed;
        } else if (iteratee) {
          // 如果 seen[] 中没有 computed 这个元素值
          if (!_.contains(seen, computed)) {
            seen.push(computed);
            result.push(value);
          }
        } else if (!_.contains(result, value)) {
          // 如果不用经过迭代函数计算，也就不用 seen[] 变量了
          result.push(value);
        }
      }
  
      return result;
    };
  
    // Produce an array that contains the union: each distinct element from all of
    // the passed-in arrays.
    // union_.union(*arrays)
    // Computes the union of the passed-in arrays:
    // the list of unique items, in order, that are present in one or more of the arrays.
    // ========== //
    // _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
    // => [1, 2, 3, 101, 10]
    // ========== //
    // 将多个数组的元素集中到一个数组中
    // 并且去重，返回数组副本
    _.union = function() {
      // 首先用 flatten 方法将传入的数组展开成一个数组
      // 然后就可以愉快地调用 _.uniq 方法了
      // 假设 _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
      // arguments 为 [[1, 2, 3], [101, 2, 1, 10], [2, 1]]
      // shallow 参数为 true，展开一层
      // 结果为 [1, 2, 3, 101, 2, 1, 10, 2, 1]
      // 然后对其去重
      return _.uniq(flatten(arguments, true, true));
    };
  
    // Produce an array that contains every item shared between all the
    // passed-in arrays.
    // 寻找几个数组中共有的元素
    // 将这些每个数组中都有的元素存入另一个数组中返回
    // _.intersection(*arrays)
    // _.intersection([1, 2, 3, 1], [101, 2, 1, 10, 1], [2, 1, 1])
    // => [1, 2]
    // 注意：返回的结果数组是去重的
    _.intersection = function(array) {
      // 结果数组
      var result = [];
  
      // 传入的参数（数组）个数
      var argsLength = arguments.length;
  
       // 遍历第一个数组的元素
      for (var i = 0, length = getLength(array); i < length; i++) {
        var item = array[i];
  
        // 如果 result[] 中已经有 item 元素了，continue
        // 即 array 中出现了相同的元素
        // 返回的 result[] 其实是个 "集合"（是去重的）
        if (_.contains(result, item)) continue;
  
        // 判断其他参数数组中是否都有 item 这个元素
        for (var j = 1; j < argsLength; j++) {
          if (!_.contains(arguments[j], item))
            break;
        }
  
        // 遍历其他参数数组完毕
        // j === argsLength 说明其他参数数组中都有 item 元素
        // 则将其放入 result[] 中
        if (j === argsLength)
          result.push(item);
      }
  
      return result;
    };
  
    // Take the difference between one array and a number of other arrays.
    // Only the elements present in just the first array will remain.
    // _.difference(array, *others)
    // Similar to without, but returns the values from array that are not present in the other arrays.
    // ===== //
    // _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
    // => [1, 3, 4]
    // ===== //
    // 剔除 array 数组中在 others 数组中出现的元素
    _.difference = function(array) {
      // 将 others 数组展开一层
      // rest[] 保存展开后的元素组成的数组
      // strict 参数为 true
      // 不可以这样用 _.difference([1, 2, 3, 4, 5], [5, 2], 10);
      // 10 就会取不到
      var rest = flatten(arguments, true, true, 1);
  
      // 遍历 array，过滤
      return _.filter(array, function(value){
        // 如果 value 存在在 rest 中，则过滤掉
        return !_.contains(rest, value);
      });
    };
  
    // Zip together multiple lists into a single array -- elements that share
    // an index go together.
    // ===== //
    // _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
    // => [["moe", 30, true], ["larry", 40, false], ["curly", 50, false]]
    // ===== //
    // 将多个数组中相同位置的元素归类
    // 返回一个数组
    _.zip = function() {
      return _.unzip(arguments);
    };
  
    // Complement of _.zip. Unzip accepts an array of arrays and groups
    // each array's elements on shared indices
    // The opposite of zip. Given an array of arrays,
    // returns a series of new arrays,
    // the first of which contains all of the first elements in the input arrays,
    // the second of which contains all of the second elements, and so on.
    // ===== //
    // _.unzip([["moe", 30, true], ["larry", 40, false], ["curly", 50, false]]);
    // => [['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]]
    // ===== //
    _.unzip = function(array) {
      var length = array && _.max(array, getLength).length || 0;
      var result = Array(length);
  
      for (var index = 0; index < length; index++) {
        result[index] = _.pluck(array, index);
      }
      return result;
    };
  
    // Converts lists into objects. Pass either a single array of `[key, value]`
    // pairs, or two parallel arrays of the same length -- one of keys, and one of
    // the corresponding values.
    // 将数组转化为对象
    _.object = function(list, values) {
      var result = {};
      for (var i = 0, length = getLength(list); i < length; i++) {
        if (values) {
          result[list[i]] = values[i];
        } else {
          result[list[i][0]] = list[i][1];
        }
      }
      return result;
    };
  
    // Generator function to create the findIndex and findLastIndex functions
    // (dir === 1) => 从前往后找
    // (dir === -1) => 从后往前找
    function createPredicateIndexFinder(dir) {
      // 经典闭包
      return function(array, predicate, context) {
        predicate = cb(predicate, context);
  
        var length = getLength(array);
  
        // 根据 dir 变量来确定数组遍历的起始位置
        var index = dir > 0 ? 0 : length - 1;
  
        for (; index >= 0 && index < length; index += dir) {
          // 找到第一个符合条件的元素
          // 并返回下标值
          if (predicate(array[index], index, array))
            return index;
        }
  
        return -1;
      };
    }
  
    // Returns the first index on an array-like that passes a predicate test
    // 从前往后找到数组中 `第一个满足条件` 的元素，并返回下标值
    // 没找到返回 -1
    // _.findIndex(array, predicate, [context])
    _.findIndex = createPredicateIndexFinder(1);
  
    // 从后往前找到数组中 `第一个满足条件` 的元素，并返回下标值
    // 没找到返回 -1
    // _.findLastIndex(array, predicate, [context])
    _.findLastIndex = createPredicateIndexFinder(-1);
  
    // Use a comparator function to figure out the smallest index at which
    // an object should be inserted so as to maintain order. Uses binary search.
    // The iteratee may also be the string name of the property to sort by (eg. length).
    // ===== //
    // _.sortedIndex([10, 20, 30, 40, 50], 35);
    // => 3
    // ===== //
    // var stooges = [{name: 'moe', age: 40}, {name: 'curly', age: 60}];
    // _.sortedIndex(stooges, {name: 'larry', age: 50}, 'age');
    // => 1
    // ===== //
    // 二分查找
    // 将一个元素插入已排序的数组
    // 返回该插入的位置下标
    // _.sortedIndex(list, value, [iteratee], [context])
    _.sortedIndex = function(array, obj, iteratee, context) {
      // 注意 cb 方法
      // iteratee 为空 || 为 String 类型（key 值）时会返回不同方法
      iteratee = cb(iteratee, context, 1);
  
      // 经过迭代函数计算的值
      // 可打印 iteratee 出来看看
      var value = iteratee(obj);
  
      var low = 0, high = getLength(array);
  
      // 二分查找
      while (low < high) {
        var mid = Math.floor((low + high) / 2);
        if (iteratee(array[mid]) < value)
          low = mid + 1;
        else
          high = mid;
      }
  
      return low;
    };
  
    // Generator function to create the indexOf and lastIndexOf functions
    // _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
    // _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
    function createIndexFinder(dir, predicateFind, sortedIndex) {
      // API 调用形式
      // _.indexOf(array, value, [isSorted])
      // _.indexOf(array, value, [fromIndex])
      // _.lastIndexOf(array, value, [fromIndex])
      return function(array, item, idx) {
        var i = 0, length = getLength(array);
  
        // 如果 idx 为 Number 类型
        // 则规定查找位置的起始点
        // 那么第三个参数不是 [isSorted]
        // 所以不能用二分查找优化了
        // 只能遍历查找
        if (typeof idx == 'number') {
          if (dir > 0) { // 正向查找
            // 重置查找的起始位置
            i = idx >= 0 ? idx : Math.max(idx + length, i);
          } else { // 反向查找
            // 如果是反向查找，重置 length 属性值
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
          }
        } else if (sortedIndex && idx && length) {
          // 能用二分查找加速的条件
          // 有序 & idx !== 0 && length !== 0
  
          // 用 _.sortIndex 找到有序数组中 item 正好插入的位置
          idx = sortedIndex(array, item);
  
          // 如果正好插入的位置的值和 item 刚好相等
          // 说明该位置就是 item 第一次出现的位置
          // 返回下标
          // 否则即是没找到，返回 -1
          return array[idx] === item ? idx : -1;
        }
  
        // 特判，如果要查找的元素是 NaN 类型
        // 如果 item !== item
        // 那么 item => NaN
        if (item !== item) {
          idx = predicateFind(slice.call(array, i, length), _.isNaN);
          return idx >= 0 ? idx + i : -1;
        }
  
        // O(n) 遍历数组
        // 寻找和 item 相同的元素
        // 特判排除了 item 为 NaN 的情况
        // 可以放心地用 `===` 来判断是否相等了
        for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
          if (array[idx] === item) return idx;
        }
  
        return -1;
      };
    }
  
    // Return the position of the first occurrence of an item in an array,
    // or -1 if the item is not included in the array.
    // If the array is large and already in sort order, pass `true`
    // for **isSorted** to use binary search.
    // _.indexOf(array, value, [isSorted])
    // 找到数组 array 中 value 第一次出现的位置
    // 并返回其下标值
    // 如果数组有序，则第三个参数可以传入 true
    // 这样算法效率会更高（二分查找）
    // [isSorted] 参数表示数组是否有序
    // 同时第三个参数也可以表示 [fromIndex] （见下面的 _.lastIndexOf）
    _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  
    // 和 _indexOf 相似
    // 反序查找
    // _.lastIndexOf(array, value, [fromIndex])
    // [fromIndex] 参数表示从倒数第几个开始往前找
    _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
  
    // Generate an integer Array containing an arithmetic progression. A port of
    // the native Python `range()` function. See
    // [the Python documentation](http://docs.python.org/library/functions.html#range).
    // 返回某一个范围内的数组成的数组
    _.range = function(start, stop, step) {
      if (stop == null) {
        stop = start || 0;
        start = 0;
      }
  
      step = step || 1;
  
      // 返回数组的长度
      var length = Math.max(Math.ceil((stop - start) / step), 0);
  
      // 返回的数组
      var range = Array(length);
  
      for (var idx = 0; idx < length; idx++, start += step) {
        range[idx] = start;
      }
  
      return range;
    };
  
  
    // Function (ahem) Functions
    // 函数的扩展方法
    // 共 14 个扩展方法
    // ------------------
  
    // Determines whether to execute a function as a constructor
    // or a normal function with the provided arguments
    var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
      // 非 new 调用 _.bind 返回的方法（即 bound）
      // callingContext 不是 boundFunc 的一个实例
      if (!(callingContext instanceof boundFunc))
        return sourceFunc.apply(context, args);
  
      // 如果是用 new 调用 _.bind 返回的方法
  
      // self 为 sourceFunc 的实例，继承了它的原型链
      // self 理论上是一个空对象（还没赋值），但是有原型链
      var self = baseCreate(sourceFunc.prototype);
  
      // 用 new 生成一个构造函数的实例
      // 正常情况下是没有返回值的，即 result 值为 undefined
      // 如果构造函数有返回值
      // 如果返回值是对象（非 null），则 new 的结果返回这个对象
      // 否则返回实例
      // @see http://www.cnblogs.com/zichi/p/4392944.html
      var result = sourceFunc.apply(self, args);
  
      // 如果构造函数返回了对象
      // 则 new 的结果是这个对象
      // 返回这个对象
      if (_.isObject(result)) return result;
  
      // 否则返回 self
      // var result = sourceFunc.apply(self, args);
      // self 对象当做参数传入
      // 会直接改变值
      return self;
    };
  
    // Create a function bound to a given object (assigning `this`, and arguments,
    // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
    // available.
    // ES5 bind 方法的扩展（polyfill）
    // 将 func 中的 this 指向 context（对象）
    // _.bind(function, object, *arguments)
    // 可选的 arguments 参数会被当作 func 的参数传入
    // func 在调用时，会优先用 arguments 参数，然后使用 _.bind 返回方法所传入的参数
    _.bind = function(func, context) {
      // 如果浏览器支持 ES5 bind 方法，并且 func 上的 bind 方法没有被重写
      // 则优先使用原生的 bind 方法
      if (nativeBind && func.bind === nativeBind)
        return nativeBind.apply(func, slice.call(arguments, 1));
  
      // 如果传入的参数 func 不是方法，则抛出错误
      if (!_.isFunction(func))
        throw new TypeError('Bind must be called on a function');
  
      // polyfill
      // 经典闭包，函数返回函数
      // args 获取优先使用的参数
      var args = slice.call(arguments, 2);
      var bound = function() {
        // args.concat(slice.call(arguments))
        // 最终函数的实际调用参数由两部分组成
        // 一部分是传入 _.bind 的参数（会被优先调用）
        // 另一部分是传入 bound（_.bind 所返回方法）的参数
        return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
      };
  
      return bound;
    };
  
    // Partially apply a function by creating a version that has had some of its
    // arguments pre-filled, without changing its dynamic `this` context. _ acts
    // as a placeholder, allowing any combination of arguments to be pre-filled.
    // _.partial(function, *arguments)
    // _.partial 能返回一个方法
    // pre-fill 该方法的一些参数
    _.partial = function(func) {
      // 提取希望 pre-fill 的参数
      // 如果传入的是 _，则这个位置的参数暂时空着，等待手动填入
      var boundArgs = slice.call(arguments, 1);
  
      var bound = function() {
        var position = 0, length = boundArgs.length;
        var args = Array(length);
        for (var i = 0; i < length; i++) {
          // 如果该位置的参数为 _，则用 bound 方法的参数填充这个位置
          // args 为调用 _.partial 方法的 pre-fill 的参数 & bound 方法的 arguments
          args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
        }
  
        // bound 方法还有剩余的 arguments，添上去
        while (position < arguments.length)
          args.push(arguments[position++]);
  
        return executeBound(func, bound, this, this, args);
      };
  
      return bound;
    };
  
    // Bind a number of an object's methods to that object. Remaining arguments
    // are the method names to be bound. Useful for ensuring that all callbacks
    // defined on an object belong to it.
    // 指定一系列方法（methodNames）中的 this 指向（object）
    // _.bindAll(object, *methodNames)
    _.bindAll = function(obj) {
      var i, length = arguments.length, key;
  
      // 如果只传入了一个参数（obj），没有传入 methodNames，则报错
      if (length <= 1)
        throw new Error('bindAll must be passed function names');
  
      // 遍历 methodNames
      for (i = 1; i < length; i++) {
        key = arguments[i];
        // 逐个绑定
        obj[key] = _.bind(obj[key], obj);
      }
      return obj;
    };
  
    // Memoize an expensive function by storing its results.
    //「记忆化」，存储中间运算结果，提高效率
    // 参数 hasher 是个 function，用来计算 key
    // 如果传入了 hasher，则用 hasher 来计算 key
    // 否则用 key 参数直接当 key（即 memoize 方法传入的第一个参数）
    // _.memoize(function, [hashFunction])
    // 适用于需要大量重复求值的场景
    // 比如递归求解菲波那切数
    // @http://www.jameskrob.com/memoize.html
    // create hash for storing "expensive" function outputs
    // run expensive function
    // check whether function has already been run with given arguments via hash lookup
    // if false - run function, and store output in hash
    // if true, return output stored in hash
    _.memoize = function(func, hasher) {
      var memoize = function(key) {
        // 储存变量，方便使用
        var cache = memoize.cache;
  
        // 求 key
        // 如果传入了 hasher，则用 hasher 函数来计算 key
        // 否则用 参数 key（即 memoize 方法传入的第一个参数）当 key
        var address = '' + (hasher ? hasher.apply(this, arguments) : key);
  
        // 如果这个 key 还没被 hash 过（还没求过值）
        if (!_.has(cache, address))
          cache[address] = func.apply(this, arguments);
  
        // 返回
        return cache[address];
      };
  
      // cache 对象被当做 key-value 键值对缓存中间运算结果
      memoize.cache = {};
  
      // 返回一个函数（经典闭包）
      return memoize;
    };
  
    // Delays a function for the given number of milliseconds, and then calls
    // it with the arguments supplied.
    // 延迟触发某方法
    // _.delay(function, wait, *arguments)
    //  如果传入了 arguments 参数，则会被当作 func 的参数在触发时调用
    // 其实是封装了「延迟触发某方法」，使其复用
    _.delay = function(func, wait) {
      // 获取 *arguments
      // 是 func 函数所需要的参数
      var args = slice.call(arguments, 2);
      return setTimeout(function(){
        // 将参数赋予 func 函数
        return func.apply(null, args);
      }, wait);
    };
  
    // Defers a function, scheduling it to run after the current call stack has
    // cleared.
    // 和 setTimeout(func, 0) 相似（源码看来似乎应该是 setTimeout(func, 1)）
    // _.defer(function, *arguments)
    // 如果传入 *arguments，会被当做参数，和 _.delay 调用方式类似（少了第二个参数）
    // 其实核心还是调用了 _.delay 方法，但第二个参数（wait 参数）设置了默认值为 1
    // 如何使得方法能设置默认值？用 _.partial 方法
    _.defer = _.partial(_.delay, _, 1);
  
    // Returns a function, that, when invoked, will only be triggered at most once
    // during a given window of time. Normally, the throttled function will run
    // as much as it can, without ever going more than once per `wait` duration;
    // but if you'd like to disable the execution on the leading edge, pass
    // `{leading: false}`. To disable execution on the trailing edge, ditto.
    // 函数节流（如果有连续事件响应，则每间隔一定时间段触发）
    // 每间隔 wait(Number) milliseconds 触发一次 func 方法
    // 如果 options 参数传入 {leading: false}
    // 那么不会马上触发（等待 wait milliseconds 后第一次触发 func）
    // 如果 options 参数传入 {trailing: false}
    // 那么最后一次回调不会被触发
    // **Notice: options 不能同时设置 leading 和 trailing 为 false**
    // 示例：
    // var throttled = _.throttle(updatePosition, 100);
    // $(window).scroll(throttled);
    // 调用方式（注意看 A 和 B console.log 打印的位置）：
    // _.throttle(function, wait, [options])
    // sample 1: _.throttle(function(){}, 1000)
    // print: A, B, B, B ...
    // sample 2: _.throttle(function(){}, 1000, {leading: false})
    // print: B, B, B, B ...
    // sample 3: _.throttle(function(){}, 1000, {trailing: false})
    // print: A, A, A, A ...
    // ----------------------------------------- //
    _.throttle = function(func, wait, options) {
      var context, args, result;
  
      // setTimeout 的 handler
      var timeout = null;
  
      // 标记时间戳
      // 上一次执行回调的时间戳
      var previous = 0;
  
      // 如果没有传入 options 参数
      // 则将 options 参数置为空对象
      if (!options)
        options = {};
  
      var later = function() {
        // 如果 options.leading === false
        // 则每次触发回调后将 previous 置为 0
        // 否则置为当前时间戳
        previous = options.leading === false ? 0 : _.now();
        timeout = null;
        // console.log('B')
        result = func.apply(context, args);
  
        // 这里的 timeout 变量一定是 null 了吧
        // 是否没有必要进行判断？
        if (!timeout)
          context = args = null;
      };
  
      // 以滚轮事件为例（scroll）
      // 每次触发滚轮事件即执行这个返回的方法
      // _.throttle 方法返回的函数
      return function() {
        // 记录当前时间戳
        var now = _.now();
  
        // 第一次执行回调（此时 previous 为 0，之后 previous 值为上一次时间戳）
        // 并且如果程序设定第一个回调不是立即执行的（options.leading === false）
        // 则将 previous 值（表示上次执行的时间戳）设为 now 的时间戳（第一次触发时）
        // 表示刚执行过，这次就不用执行了
        if (!previous && options.leading === false)
          previous = now;
  
        // 距离下次触发 func 还需要等待的时间
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
  
        // 要么是到了间隔时间了，随即触发方法（remaining <= 0）
        // 要么是没有传入 {leading: false}，且第一次触发回调，即立即触发
        // 此时 previous 为 0，wait - (now - previous) 也满足 <= 0
        // 之后便会把 previous 值迅速置为 now
        // ========= //
        // remaining > wait，表示客户端系统时间被调整过
        // 则马上执行 func 函数
        // @see https://blog.coding.net/blog/the-difference-between-throttle-and-debounce-in-underscorejs
        // ========= //
  
        // console.log(remaining) 可以打印出来看看
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            // 解除引用，防止内存泄露
            timeout = null;
          }
  
          // 重置前一次触发的时间戳
          previous = now;
  
          // 触发方法
          // result 为该方法返回值
          // console.log('A')
          result = func.apply(context, args);
  
          // 引用置为空，防止内存泄露
          // 感觉这里的 timeout 肯定是 null 啊？这个 if 判断没必要吧？
          if (!timeout)
            context = args = null;
        } else if (!timeout && options.trailing !== false) { // 最后一次需要触发的情况
          // 如果已经存在一个定时器，则不会进入该 if 分支
          // 如果 {trailing: false}，即最后一次不需要触发了，也不会进入这个分支
          // 间隔 remaining milliseconds 后触发 later 方法
          timeout = setTimeout(later, remaining);
        }
  
        // 回调返回值
        return result;
      };
    };
  
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    // 函数去抖（连续事件触发结束后只触发一次）
    // sample 1: _.debounce(function(){}, 1000)
    // 连续事件结束后的 1000ms 后触发
    // sample 1: _.debounce(function(){}, 1000, true)
    // 连续事件触发后立即触发（此时会忽略第二个参数）
    _.debounce = function(func, wait, immediate) {
      var timeout, args, context, timestamp, result;
  
      var later = function() {
        // 定时器设置的回调 later 方法的触发时间，和连续事件触发的最后一次时间戳的间隔
        // 如果间隔为 wait（或者刚好大于 wait），则触发事件
        var last = _.now() - timestamp;
  
        // 时间间隔 last 在 [0, wait) 中
        // 还没到触发的点，则继续设置定时器
        // last 值应该不会小于 0 吧？
        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          // 到了可以触发的时间点
          timeout = null;
          // 可以触发了
          // 并且不是设置为立即触发的
          // 因为如果是立即触发（callNow），也会进入这个回调中
          // 主要是为了将 timeout 值置为空，使之不影响下次连续事件的触发
          // 如果不是立即执行，随即执行 func 方法
          if (!immediate) {
            // 执行 func 函数
            result = func.apply(context, args);
            // 这里的 timeout 一定是 null 了吧
            // 感觉这个判断多余了
            if (!timeout)
              context = args = null;
          }
        }
      };
  
      // 嗯，闭包返回的函数，是可以传入参数的
      // 也是 DOM 事件所触发的回调函数
      return function() {
        // 可以指定 this 指向
        context = this;
        args = arguments;
  
        // 每次触发函数，更新时间戳
        // later 方法中取 last 值时用到该变量
        // 判断距离上次触发事件是否已经过了 wait seconds 了
        // 即我们需要距离最后一次事件触发 wait seconds 后触发这个回调方法
        timestamp = _.now();
  
        // 立即触发需要满足两个条件
        // immediate 参数为 true，并且 timeout 还没设置
        // immediate 参数为 true 是显而易见的
        // 如果去掉 !timeout 的条件，就会一直触发，而不是触发一次
        // 因为第一次触发后已经设置了 timeout，所以根据 timeout 是否为空可以判断是否是首次触发
        var callNow = immediate && !timeout;
  
        // 设置 wait seconds 后触发 later 方法
        // 无论是否 callNow（如果是 callNow，也进入 later 方法，去 later 方法中判断是否执行相应回调函数）
        // 在某一段的连续触发中，只会在第一次触发时进入这个 if 分支中
        if (!timeout)
          // 设置了 timeout，所以以后不会进入这个 if 分支了
          timeout = setTimeout(later, wait);
  
        // 如果是立即触发
        if (callNow) {
          // func 可能是有返回值的
          result = func.apply(context, args);
          // 解除引用
          context = args = null;
        }
  
        return result;
      };
    };
  
    // Returns the first function passed as an argument to the second,
    // allowing you to adjust arguments, run code before and after, and
    // conditionally execute the original function.
    _.wrap = function(func, wrapper) {
      return _.partial(wrapper, func);
    };
  
    // Returns a negated version of the passed-in predicate.
    // 返回一个 predicate 方法的对立方法
    // 即该方法可以对原来的 predicate 迭代结果值取补集
    _.negate = function(predicate) {
      return function() {
        return !predicate.apply(this, arguments);
      };
    };
  
    // Returns a function that is the composition of a list of functions, each
    // consuming the return value of the function that follows.
    // _.compose(*functions)
    // var tmp = _.compose(f, g, h)
    // tmp(args) => f(g(h(args)))
    _.compose = function() {
      var args = arguments; // funcs
      var start = args.length - 1; // 倒序调用
      return function() {
        var i = start;
        var result = args[start].apply(this, arguments);
        // 一个一个方法地执行
        while (i--)
          result = args[i].call(this, result);
        return result;
      };
    };
  
    // Returns a function that will only be executed on and after the Nth call.
    // 第 times 触发执行 func（事实上之后的每次触发还是会执行 func）
    // 有什么用呢？
    // 如果有 N 个异步事件，所有异步执行完后执行该回调，即 func 方法（联想 eventproxy）
    // _.after 会返回一个函数
    // 当这个函数第 times 被执行的时候
    // 触发 func 方法
    _.after = function(times, func) {
      return function() {
        // 函数被触发了 times 了，则执行 func 函数
        // 事实上 times 次后如果函数继续被执行，也会触发 func
        if (--times < 1) {
          return func.apply(this, arguments);
        }
      };
    };
  
    // Returns a function that will only be executed up to (but not including) the Nth call.
    // 函数至多被调用 times - 1 次（(but not including) the Nth call）
    // func 函数会触发 time - 1 次（Creates a version of the function that can be called no more than count times）
    // func 函数有个返回值，前 time - 1 次触发的返回值都是将参数代入重新计算的
    // 第 times 开始的返回值为第 times - 1 次时的返回值（不重新计算）
    // The result of the last function call is memoized and returned when count has been reached.
    _.before = function(times, func) {
      var memo;
      return function() {
        if (--times > 0) {
          // 缓存函数执行结果
          memo = func.apply(this, arguments);
        }
  
        // func 引用置为空，其实不置为空也用不到 func 了
        if (times <= 1)
          func = null;
  
        // 前 times - 1 次触发，memo 都是分别计算返回
        // 第 times 次开始，memo 值同 times - 1 次时的 memo
        return memo;
      };
    };
  
    // Returns a function that will be executed at most one time, no matter how
    // often you call it. Useful for lazy initialization.
    // 函数至多只能被调用一次
    // 适用于这样的场景，某些函数只能被初始化一次，不得不设置一个变量 flag
    // 初始化后设置 flag 为 true，之后不断 check flag
    // ====== //
    // 其实是调用了 _.before 方法，并且将 times 参数设置为了默认值 2（也就是 func 至多能被调用 2 - 1 = 1 次）
    _.once = _.partial(_.before, 2);
  
  
    // Object Functions
    // 对象的扩展方法
    // 共 38 个扩展方法
    // ----------------
  
    // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
    // IE < 9 下 不能用 for key in ... 来枚举对象的某些 key
    // 比如重写了对象的 `toString` 方法，这个 key 值就不能在 IE < 9 下用 for in 枚举到
    // IE < 9，{toString: null}.propertyIsEnumerable('toString') 返回 false
    // IE < 9，重写的 `toString` 属性被认为不可枚举
    // 据此可以判断是否在 IE < 9 浏览器环境中
    var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  
    // IE < 9 下不能用 for in 来枚举的 key 值集合
    // 其实还有个 `constructor` 属性
    // 个人觉得可能是 `constructor` 和其他属性不属于一类
    // nonEnumerableProps[] 中都是方法
    // 而 constructor 表示的是对象的构造函数
    // 所以区分开来了
    var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                        'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];
  
    // obj 为需要遍历键值对的对象
    // keys 为键数组
    // 利用 JavaScript 按值传递的特点
    // 传入数组作为参数，能直接改变数组的值
    function collectNonEnumProps(obj, keys) {
      var nonEnumIdx = nonEnumerableProps.length;
      var constructor = obj.constructor;
  
      // 获取对象的原型
      // 如果 obj 的 constructor 被重写
      // 则 proto 变量为 Object.prototype
      // 如果没有被重写
      // 则为 obj.constructor.prototype
      var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;
  
      // Constructor is a special case.
      // `constructor` 属性需要特殊处理 (是否有必要？)
      // see https://github.com/hanzichi/underscore-analysis/issues/3
      // 如果 obj 有 `constructor` 这个 key
      // 并且该 key 没有在 keys 数组中
      // 存入 keys 数组
      var prop = 'constructor';
      if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);
  
      // 遍历 nonEnumerableProps 数组中的 keys
      while (nonEnumIdx--) {
        prop = nonEnumerableProps[nonEnumIdx];
        // prop in obj 应该肯定返回 true 吧？是否有判断必要？
        // obj[prop] !== proto[prop] 判断该 key 是否来自于原型链
        // 即是否重写了原型链上的属性
        if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
          keys.push(prop);
        }
      }
    }
  
    // Retrieve the names of an object's own properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`
    // ===== //
    // _.keys({one: 1, two: 2, three: 3});
    // => ["one", "two", "three"]
    // ===== //
    // 返回一个对象的 keys 组成的数组
    // 仅返回 own enumerable properties 组成的数组
    _.keys = function(obj) {
      // 容错
      // 如果传入的参数不是对象，则返回空数组
      if (!_.isObject(obj)) return [];
  
      // 如果浏览器支持 ES5 Object.key() 方法
      // 则优先使用该方法
      if (nativeKeys) return nativeKeys(obj);
  
      var keys = [];
  
      // own enumerable properties
      for (var key in obj)
        // hasOwnProperty
        if (_.has(obj, key)) keys.push(key);
  
      // Ahem, IE < 9.
      // IE < 9 下不能用 for in 来枚举某些 key 值
      // 传入 keys 数组为参数
      // 因为 JavaScript 下函数参数按值传递
      // 所以 keys 当做参数传入后会在 `collectNonEnumProps` 方法中改变值
      if (hasEnumBug) collectNonEnumProps(obj, keys);
  
      return keys;
    };
  
    // Retrieve all the property names of an object.
    // 返回一个对象的 keys 数组
    // 不仅仅是 own enumerable properties
    // 还包括原型链上继承的属性
    _.allKeys = function(obj) {
      // 容错
      // 不是对象，则返回空数组
      if (!_.isObject(obj)) return [];
  
      var keys = [];
      for (var key in obj) keys.push(key);
  
      // Ahem, IE < 9.
      // IE < 9 下的 bug，同 _.keys 方法
      if (hasEnumBug) collectNonEnumProps(obj, keys);
  
      return keys;
    };
  
    // Retrieve the values of an object's 