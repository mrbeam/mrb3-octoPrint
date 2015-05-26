/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



Snap.plugin(function (Snap, Element, Paper, global) {
	// Flattens transformations of element or it's children and sub-children
	// toCubics: converts all segments to cubics
	// toAbsolute: converts all segments to Absolute
	// dec: number of digits after decimal separator
	// Returns: no return value
	Element.prototype.bake = function (toCubics, toAbsolute, rectAsArgs, dec) {
		var elem = this;
		if (!elem || !elem.paper) // don't handle unplaced elements. this causes double handling.
			return;
		if (typeof (rectAsArgs) === 'undefined')
			rectAsArgs = false;
		if (typeof (toCubics) === 'undefined')
			toCubics = false;
		if (typeof (toAbsolute) === 'undefined')
			toAbsolute = false;
		if (typeof (dec) === 'undefined')
			dec = 5;
		var children = elem.selectAll('*')
		if (children.length > 0) {
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				child.bake(toCubics, toAbsolute, rectAsArgs, dec);
			}
			elem.attr({transform: ''});
			return;
		}
		if (!(elem.type === "circle" ||
				elem.type === "rect" ||
				elem.type === "ellipse" ||
				elem.type === "line" ||
				elem.type === "polygon" ||
				elem.type === "polyline" ||
				elem.type === "path"))
			return;

		if(elem.type !== 'path'){
			console.log("bake: converting " + elem.type + " to path");
		}
		var path_elem = elem.convertToPath(rectAsArgs);

		if (!path_elem || path_elem.attr(d) === '')
			return 'M 0 0';

		// Rounding coordinates to dec decimals
		if (dec || dec === 0) {
			if (dec > 15)
				dec = 15;
			else if (dec < 0)
				dec = 0;
		}
		else
			dec = false;

		function r(num) {
			if (dec !== false)
				return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
			else
				return num;
		}

		var arr;
		var d = path_elem.attr('d').trim();

		// If you want to retain current path commans, set toCubics to false
		if (!toCubics) { // Set to false to prevent possible re-normalization. 
			arr = Snap.parsePathString(d); // str to array
			var arr_orig = arr;
			arr = pathToAbsolute(arr); // mahvstcsqz -> uppercase
		}
		// If you want to modify path data using nonAffine methods,
		// set toCubics to true
		else {
			arr = path2curve(d); // mahvstcsqz -> MC
			var arr_orig = arr;
		}
		//var svgDOM = pathDOM.ownerSVGElement;

		// Get the relation matrix that converts path coordinates
		// to SVGroot's coordinate space
		var transform = path_elem.transform();
		var matrix = transform['totalMatrix'];

		// The following code can bake transformations
		// both normalized and non-normalized data
		// Coordinates have to be Absolute in the following
		var j,m = arr.length,
			letter = '',
			letter_orig = '',
			x = 0,
			y = 0,
			point = {}, newcoords = [],
			pt = {x: 0, y: 0},
			subpath_start = {}, 
			prevX = 0,
			prevY = 0;
		subpath_start.x = null;
		subpath_start.y = null;
		for (var i=0; i < m; i++) {
			letter = arr[i][0].toUpperCase();
			letter_orig = arr_orig[i][0];
			newcoords[i] = [];
			newcoords[i][0] = arr[i][0];

			if (letter === 'A') {
				x = arr[i][6];
				y = arr[i][7];

				pt.x = arr[i][6];
				pt.y = arr[i][7];
				newcoords[i] = arc_transform(arr[i][1], arr[i][2], arr[i][3], arr[i][4], arr[i][5], pt, matrix);
				// rounding arc parameters
				// x,y are rounded normally
				// other parameters at least to 5 decimals
				// because they affect more than x,y rounding
				newcoords[i][1] = newcoords[i][1]; //rx
				newcoords[i][2] = newcoords[i][2]; //ry
				newcoords[i][3] = newcoords[i][3]; //x-axis-rotation
				newcoords[i][6] = newcoords[i][6]; //x
				newcoords[i][7] = newcoords[i][7]; //y
			}
			else if (letter !== 'Z') {
				// parse other segs than Z and A
				for (j = 1; j < arr[i].length; j = j + 2) {
					if (letter === 'V')
						y = arr[i][j];
					else if (letter === 'H')
						x = arr[i][j];
					else {
						x = arr[i][j];
						y = arr[i][j + 1];
					}
					pt.x = x;
					pt.y = y;
					point.x = matrix.x(pt.x, pt.y);
					point.y = matrix.y(pt.x, pt.y);
					//point = pt.matrixTransform(matrix);

					if (letter === 'V' || letter === 'H') {
						newcoords[i][0] = 'L';
						newcoords[i][j] = point.x;
						newcoords[i][j + 1] = point.y;
					}
					else {
						newcoords[i][j] = point.x;
						newcoords[i][j + 1] = point.y;
					}
				}
			}
			if ((letter !== 'Z' && subpath_start.x === null) || letter === 'M') {
				subpath_start.x = x;
				subpath_start.y = y;
			}
			if (letter === 'Z') {
				x = subpath_start.x;
				y = subpath_start.y;
			}
		}
		// Convert all that was relative back to relative
		// This could be combined to above, but to make code more readable
		// this is made separately.
		var prevXtmp = 0;
		var prevYtmp = 0;
		subpath_start.x = '';
		for (i = 0; i < newcoords.length; i++) {
			letter_orig = arr_orig[i][0];
			if (letter_orig === 'A' || letter_orig === 'M' || letter_orig === 'L' || letter_orig === 'C' || letter_orig === 'S' || letter_orig === 'Q' || letter_orig === 'T' || letter_orig === 'H' || letter_orig === 'V') {
				var len = newcoords[i].length;
				var lentmp = len;
				if (letter_orig === 'A') {
					newcoords[i][6] = r(newcoords[i][6]);
					newcoords[i][7] = r(newcoords[i][7]);
				}
				else {
					lentmp--;
					while (--lentmp)
						newcoords[i][lentmp] = r(newcoords[i][lentmp]);
				}
				prevX = newcoords[i][len - 2];
				prevY = newcoords[i][len - 1];
			}
			else
			if (letter_orig === 'a') {
				prevXtmp = newcoords[i][6];
				prevYtmp = newcoords[i][7];
				newcoords[i][0] = letter_orig;
				newcoords[i][6] = r(newcoords[i][6] - prevX);
				newcoords[i][7] = r(newcoords[i][7] - prevY);
				prevX = prevXtmp;
				prevY = prevYtmp;
			}
			else
			if (letter_orig === 'm' || letter_orig === 'l' || letter_orig === 'c' || letter_orig === 's' || letter_orig === 'q' || letter_orig === 't' || letter_orig === 'h' || letter_orig === 'v') {
				var len = newcoords[i].length;
				prevXtmp = newcoords[i][len - 2];
				prevYtmp = newcoords[i][len - 1];
				for (j = 1; j < len; j = j + 2) {
					if (letter_orig === 'h' || letter_orig === 'v')
						newcoords[i][0] = 'l';
					else
						newcoords[i][0] = letter_orig;
					newcoords[i][j] = r(newcoords[i][j] - prevX);
					newcoords[i][j + 1] = r(newcoords[i][j + 1] - prevY);
				}
				prevX = prevXtmp;
				prevY = prevYtmp;
			}
			if ((letter_orig.toLowerCase() !== 'z' && subpath_start.x === '') || letter_orig.toLowerCase() === 'm') {
				subpath_start.x = prevX;
				subpath_start.y = prevY;
			}
			if (letter_orig.toLowerCase() === 'z') {
				prevX = subpath_start.x;
				prevY = subpath_start.y;
			}
		}
		if (toAbsolute)
			newcoords = pathToAbsolute(newcoords);
		var d_str = convertToString(newcoords);
		path_elem.attr({d: d_str});
		path_elem.attr({transform: ''});
		console.log("baked matrix ", matrix, " of ", path_elem.attr('id'));

	};

	var convertToString = function (arr) {
		return arr.join(',').replace(p2s, '$1');
	};
	
	Element.prototype.convertToPath = function(rectAsArgs){
		var old_element = this;
		var pathAttr = old_element.toPath(rectAsArgs);
		var path = old_element.paper.path(pathAttr);
		old_element.before(path);
		old_element.remove(); 
		return path;
	};

	// Converts all shapes to path retaining attributes.
	// old_element - DOM element to be replaced by path. Can be one of the following:
	//   ellipse, circle, path, line, polyline, polygon and rect.
	// rectAsArgs - Boolean. If true, rect roundings will be as arcs. Otherwise as cubics.
	// Return value: path element.
	// Source: https://github.com/duopixel/Method-Draw/blob/master/editor/src/svgcanvas.js
	// Modifications: Timo (https://github.com/timo22345)
	Element.prototype.toPath = function (rectAsArgs) {
		var old_element = this;

		// Create new path element
		var path = {};

		// All attributes that path element can have
		var attrs = ['requiredFeatures', 'requiredExtensions', 'systemLanguage', 'id', 'xml:base', 'xml:lang', 'xml:space', 'onfocusin', 'onfocusout', 'onactivate', 'onclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmousemove', 'onmouseout', 'onload', 'alignment-baseline', 'baseline-shift', 'clip', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cursor', 'direction', 'display', 'dominant-baseline', 'enable-background', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'glyph-orientation-horizontal', 'glyph-orientation-vertical', 'image-rendering', 'kerning', 'letter-spacing', 'lighting-color', 'marker-end', 'marker-mid', 'marker-start', 'mask', 'opacity', 'overflow', 'pointer-events', 'shape-rendering', 'stop-color', 'stop-opacity', 'stroke', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration', 'text-rendering', 'unicode-bidi', 'visibility', 'word-spacing', 'writing-mode', 'class', 'style', 'externalResourcesRequired', 'transform', 'd', 'pathLength'];

		// Copy attributes of old_element to path
		for(var attrIdx in attrs){
			var attrName = attrs[attrIdx];
			var attrValue = old_element.attr(attrName);
			if (attrValue)
				path[attrName] = attrValue;
		}

		var d = '';

		var valid = function (val) {
			return !(typeof (val) !== 'number' || val === Infinity || val < 0);
		};

		// Possibly the cubed root of 6, but 1.81 works best
		var num = 1.81;
		var tag = old_element.type;
		switch (tag) {
			case 'ellipse':
			case 'circle':
				var rx = +parseFloat(old_element.attr('rx')),
						ry = +parseFloat(old_element.attr('ry')),
						cx = +parseFloat(old_element.attr('cx')),
						cy = +old_element.attr('cy');
				if (tag === 'circle') {
					rx = ry = +old_element.attr('r');
				}

				d += convertToString([
					['M', (cx - rx), (cy)],
					['C', (cx - rx), (cy - ry / num), (cx - rx / num), (cy - ry), (cx), (cy - ry)],
					['C', (cx + rx / num), (cy - ry), (cx + rx), (cy - ry / num), (cx + rx), (cy)],
					['C', (cx + rx), (cy + ry / num), (cx + rx / num), (cy + ry), (cx), (cy + ry)],
					['C', (cx - rx / num), (cy + ry), (cx - rx), (cy + ry / num), (cx - rx), (cy)],
					['Z']
				]);
				break;
			case 'path':
				d = old_element.attr('d');
				break;
			case 'line':
				var x1 = parseFloat(old_element.attr('x1')),
						y1 = parseFloat(old_element.attr('y1')),
						x2 = parseFloat(old_element.attr('x2')),
						y2 = old_element.attr('y2');
				d = 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2;
				break;
			case 'polyline':
				d = 'M' + old_element.attr('points');
				break;
			case 'polygon':
				d = 'M' + old_element.attr('points') + 'Z';
				break;
			case 'rect':
				var rx = + parseFloat(old_element.attr('rx')),
						ry = +parseFloat(old_element.attr('ry')),
						x = parseFloat(old_element.attr('x')),
						y = parseFloat(old_element.attr('y')),
						w = parseFloat(old_element.attr('width')),
						h = parseFloat(old_element.attr('height'));

				// Validity checks from http://www.w3.org/TR/SVG/shapes.html#RectElement:
				// If neither ‘rx’ nor ‘ry’ are properly specified, then set both rx and ry to 0. (This will result in square corners.)
				if (!valid(rx) && !valid(ry))
					rx = ry = 0;
				// Otherwise, if a properly specified value is provided for ‘rx’, but not for ‘ry’, then set both rx and ry to the value of ‘rx’.
				else if (valid(rx) && !valid(ry))
					ry = rx;
				// Otherwise, if a properly specified value is provided for ‘ry’, but not for ‘rx’, then set both rx and ry to the value of ‘ry’.
				else if (valid(ry) && !valid(rx))
					rx = ry;
				else {
					// If rx is greater than half of ‘width’, then set rx to half of ‘width’.
					if (rx > w / 2)
						rx = w / 2;
					// If ry is greater than half of ‘height’, then set ry to half of ‘height’.
					if (ry > h / 2)
						ry = h / 2;
				}

				if (!rx && !ry) {
					d += convertToString([
						['M', x, y],
						['L', x + w, y],
						['L', x + w, y + h],
						['L', x, y + h],
						['L', x, y],
						['Z']
					]);
				}
				else if (rectAsArgs) {
					d += convertToString([
						['M', x + rx, y],
						['H', x + w - rx],
						['A', rx, ry, 0, 0, 1, x + w, y + ry],
						['V', y + h - ry],
						['A', rx, ry, 0, 0, 1, x + w - rx, y + h],
						['H', x + rx],
						['A', rx, ry, 0, 0, 1, x, y + h - ry],
						['V', y + ry],
						['A', rx, ry, 0, 0, 1, x + rx, y]
					]);
				}
				else {
					var num = 2.19;
					if (!ry)
						ry = rx;
					d += convertToString([
						['M', x, y + ry],
						['C', x, y + ry / num, x + rx / num, y, x + rx, y],
						['L', x + w - rx, y],
						['C', x + w - rx / num, y, x + w, y + ry / num, x + w, y + ry],
						['L', x + w, y + h - ry],
						['C', x + w, y + h - ry / num, x + w - rx / num, y + h, x + w - rx, y + h],
						['L', x + rx, y + h],
						['C', x + rx / num, y + h, x, y + h - ry / num, x, y + h - ry],
						['L', x, y + ry],
						['Z']
					]);
				}
				break;
			default:
				//path.parentNode.removeChild(path);
				break;
		}

		if (d)
			path.d = d;

		return path;
	};

	var pathToAbsolute = cacher(function (pathArray) {
		//var pth = paths(pathArray); // Timo: commented to prevent multiple caching
		// for some reason only FF proceed correctly
		// when not cached using cacher() around
		// this function.
		//if (pth.abs) return pathClone(pth.abs)
		if (!R.is(pathArray, 'array') || !R.is(pathArray && pathArray[0], 'array'))
			pathArray = parsePathString(pathArray);
		if (!pathArray || !pathArray.length)
			return [['M', 0, 0]];
		var res = [],
				x = 0,
				y = 0,
				mx = 0,
				my = 0,
				start = 0;
		if (pathArray[0][0] === 'M') {
			x = +pathArray[0][1];
			y = +pathArray[0][2];
			mx = x;
			my = y;
			start++;
			res[0] = ['M', x, y];
		}
		var crz = pathArray.length === 3 && pathArray[0][0] === 'M' && pathArray[1][0].toUpperCase() === 'R' && pathArray[2][0].toUpperCase() === 'Z';
		for (var r, pa, i = start, ii = pathArray.length; i < ii; i++) {
			res.push(r = []);
			pa = pathArray[i];
			if (pa[0] !== String.prototype.toUpperCase.call(pa[0])) {
				r[0] = String.prototype.toUpperCase.call(pa[0]);
				switch (r[0]) {
					case 'A':
						r[1] = pa[1];
						r[2] = pa[2];
						r[3] = pa[3];
						r[4] = pa[4];
						r[5] = pa[5];
						r[6] = +(pa[6] + x);
						r[7] = +(pa[7] + y);
						break;
					case 'V':
						r[1] = +pa[1] + y;
						break;
					case 'H':
						r[1] = +pa[1] + x;
						break;
					case 'R':
						var dots = [x, y]['concat'](pa.slice(1));
						for (var j = 2, jj = dots.length; j < jj; j++) {
							dots[j] = +dots[j] + x;
							dots[++j] = +dots[j] + y;
						}
						res.pop();
						res = res['concat'](catmullRom2bezier(dots, crz));
						break;
					case 'M':
						mx = +pa[1] + x;
						my = +pa[2] + y;
					default:
					for (j = 1, jj = pa.length; j < jj; j++)
						r[j] = +pa[j] + (j % 2 ? x : y);
				}
			}
			else {
				if (pa[0] === 'R') {
					dots = [x, y]['concat'](pa.slice(1));
					res.pop();
					res = res['concat'](catmullRom2bezier(dots, crz));
					r = ['R']['concat'](pa.slice(-2));
				}
				else {
					for (var k = 0, kk = pa.length; k < kk; k++)
						r[k] = pa[k];
				}
			}
			switch (r[0]) {
				case 'Z':
					x = mx;
					y = my;
					break;
				case 'H':
					x = r[1];
					break;
				case 'V':
					y = r[1];
					break;
				case 'M':
					mx = r[r.length - 2];
					my = r[r.length - 1];
				default:
					x = r[r.length - 2];
					y = r[r.length - 1];
			}
		}
		res.toString = R._path2string;
		//pth.abs = pathClone(res);
		return res;
	});

	function cacher(f, scope, postprocessor) {
		function newf() {
			var arg = Array.prototype.slice.call(arguments, 0),
					args = arg.join('\u2400');
			var cache = newf.cache = newf.cache || {};
			var count = newf.count = newf.count || [];
			if (cache.hasOwnProperty(args)) {
				for (var i = 0, ii = count.length; i < ii; i++)
					if (count[i] === args) {
						count.push(count.splice(i, 1)[0]);
					}
				return postprocessor ? postprocessor(cache[args]) : cache[args];
			}
			count.length >= 1E3 && delete cache[count.shift()];
			count.push(args);
			cache[args] = f.apply(scope, arg);
			return postprocessor ? postprocessor(cache[args]) : cache[args];
		}
		return newf;
	}

	var R = {};
	var p2s = /,?([achlmqrstvxz]),?/gi;
	var pathCommand = /([achlmrqstvz])[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029,]*((-?\d*\.?\d*(?:e[\-+]?\d+)?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*)+)/ig;
	var pathValues = /(-?\d*\.?\d*(?:e[\-+]?\d+)?)[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*/ig;
	var isnan = {
		'NaN': 1,
		'Infinity': 1,
		'-Infinity': 1
	};
	R.is = function (o, type) {
		type = String.prototype.toLowerCase.call(type);
		if (type === 'finite') {
			return !isnan.hasOwnProperty(+o);
		}
		if (type === 'array') {
			return o instanceof Array;
		}
		return type === 'null' && o === null || type === typeof o && o !== null || type === 'object' && o === Object(o) || type === 'array' && Array.isArray && Array.isArray(o) || Object.prototype.toString.call(o).slice(8, -1).toLowerCase() === type;
	};

	R._path2string = function () {
		return this.join(',').replace(p2s, '$1');
	};


});

