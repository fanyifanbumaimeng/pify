'use strict';

const processFn = (fn, opts) => function () {

	const P = opts.promiseModule;
	const args = new Array(arguments.length);

	for (let i = 0; i < arguments.length; i++) {
		args[i] = arguments[i];
	}

	return new P((resolve, reject) => {
		//ErrorFirst模式，回调的第一个参数是错误信息
		if (opts.errorFirst) {
			args.push(function (err, result) {
				//设置为multiArgs则回调函数的参数会是一个数组
				/*
				* var [httpResponse,body]  = result;
				* */
				if (opts.multiArgs) {
					const results = new Array(arguments.length - 1);

					for (let i = 1; i < arguments.length; i++) {
						results[i - 1] = arguments[i];
					}

					//错误处理
					if (err) {
						results.unshift(err);
						reject(results);
					} else {
						resolve(results);
					}
				} else if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		} else {
			args.push(function (result) {
				if (opts.multiArgs) {
					const results = new Array(arguments.length - 1);

					for (let i = 0; i < arguments.length; i++) {
						results[i] = arguments[i];
					}

					resolve(results);
				} else {
					resolve(result);
				}
			});
		}

		fn.apply(this, args);
	});
};

module.exports = (obj, opts) => {
	//处理默认参数情况，
	opts = Object.assign({
		exclude: [/.+(Sync|Stream)$/],
		//默认第一个参数是错误信息
		errorFirst: true,
		promiseModule: Promise
	}, opts);

	const filter = key => {
		const match = pattern => typeof pattern === 'string' ? key === pattern : pattern.test(key);
		//include则返回相应模块，exlcude则返回其他模块
		return opts.include ? opts.include.some(match) : !opts.exclude.some(match);
	};

	let ret;
	//传入的第一个参数可以是一个函数，如果不是，则创建该对象的构造器对象。
	if (typeof obj === 'function') {
		ret = function () {
			//如果是excludeMain模式，则只会对该函数上的方法进行promise化，而不会对它自身进行promis化
			if (opts.excludeMain) {
				return obj.apply(this, arguments);
			}

			return processFn(obj, opts).apply(this, arguments);
		};
	} else {
		ret = Object.create(Object.getPrototypeOf(obj));
	}
	//将obj上的所有函数进行promise化
	for (const key in obj) { // eslint-disable-line guard-for-in
		const x = obj[key];
		ret[key] = typeof x === 'function' && filter(key) ? processFn(x, opts) : x;
	}

	return ret;
};
