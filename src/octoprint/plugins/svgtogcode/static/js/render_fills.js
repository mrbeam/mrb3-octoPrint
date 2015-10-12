//    render_fills - a snapsvg.io plugin to render fills of svg files into a bitmap.
//    Copyright (C) 2015  Teja Philipp <osd@tejaphilipp.de>
//    
//    based on work by http://davidwalsh.name/convert-canvas-image 
//    and http://getcontext.net/read/svg-images-on-a-html5-canvas
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU Affero General Public License as
//    published by the Free Software Foundation, either version 3 of the
//    License, or (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Affero General Public License for more details.
//
//    You should have received a copy of the GNU Affero General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.



Snap.plugin(function (Snap, Element, Paper, global) {
	

	
	/**
	 * @param {elem} elem start point
	 * 
	 * @returns {path}
	 */

	Element.prototype.removeUnfilled = function(){
		var elem = this;
		var selection = [];
		var children = elem.children();

		
		if (children.length > 0) {
			var goRecursive = (elem.type !== "defs" && // ignore these tags
				elem.type !== "clipPath" &&
				elem.type !== "metadata" &&
				elem.type !== "rdf:rdf" &&
				elem.type !== "cc:work" &&
				elem.type !== "sodipodi:namedview");
		
			if(goRecursive) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					selection = selection.concat(child.removeUnfilled());
				}
			}
		} else {
			if(elem.is_filled()){
				selection.push(elem);
			} else {
				elem.remove();
			}
		}
		return selection;
	};

	Element.prototype.is_filled = function(){
		var elem = this;
		
		// TODO text support
		// TODO opacity support
		if (elem.type !== "circle" &&
			elem.type !== "rect" &&
			elem.type !== "ellipse" &&
			elem.type !== "line" &&
			elem.type !== "polygon" &&
			elem.type !== "polyline" &&
			elem.type !== "path" && 
			elem.type !== "image"){
			
			return false;
		}
		
		if(elem.type === 'image'){
			return true;
		}
		
		var fill = elem.attr('fill');
		var opacity = elem.attr('fill-opacity');
		
		if(fill !== 'none'){
			if(opacity === null || opacity > 0){
				return true;
			}
		}
		return false;
	};
	
	Element.prototype.embedImage = function(){
		var elem = this;
		if(elem.type !== 'image') return;

		var url = elem.attr('href');
		var image = new Image();

		image.onload = function () {
			var canvas = document.createElement('canvas');
			canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
			canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

			canvas.getContext('2d').drawImage(this, 0, 0);
			var dataUrl = canvas.toDataURL('image/png');
			elem.attr('href', dataUrl);
			canvas.remove();
			console.log('embedded img');
		};

		image.src = url;
	
	};
	
	Element.prototype.renderPNG = function (wMM, hMM, pxPerMM, callback) {
		var elem = this;

		// get svg as dataUrl
		var svgStr = elem.outerSVG();
		var svgDataUri = 'data:image/svg+xml;base64,' + window.btoa(svgStr);
		var source = new Image();
		source.src = svgDataUri;

		// init render canvas and attach to page
		var renderCanvas = document.createElement('canvas');
		renderCanvas.id = "renderCanvas";
		renderCanvas.width = wMM * pxPerMM;
		renderCanvas.height = hMM * pxPerMM;	
		document.getElementsByTagName('body')[0].appendChild(renderCanvas);
		var renderCanvasContext = renderCanvas.getContext('2d');

		// render SVG image to the canvas once it loads.
		source.onload = function () {
			renderCanvasContext.drawImage(source, 0, 0, renderCanvas.width, renderCanvas.height);

			// place fill bitmap into svg
			var fillBitmap = renderCanvas.toDataURL("image/png");
			if(typeof callback === 'function'){
				callback(fillBitmap);
			}
			//renderCanvas.remove();
		};

		// catch browsers without native svg support
		source.onerror = function() {
			console.error("Can't export! Maybe your browser doesn't support native SVG. Sorry.");
		};
	};


});

_renderInfill = function (wMM, hMM, pxPerMM, callback) {
	// TODO abort transformations
	$('#tmpSvg').remove();
	snap.selectAll('#fillRendering').remove();
	var wPT = wMM * 90/25.4;
	var hPT = hMM * 90/25.4;
	var tmpSvg = Snap(wPT,hPT);
	tmpSvg.attr('id', 'tmpSvg');

	// get filled
	var userContent = snap.select("#userContent").clone();
	tmpSvg.append(userContent);
	userContent.bake();
	var fillings = userContent.removeUnfilled();
	for (var i = 0; i < fillings.length; i++) {
		var item = fillings[i];
		if(item.type === 'image'){
			item.embedImage();
		} else {
			item.attr('fill', '#ff0000');
			item.attr('stroke', 'none');
		}
	}
	
	var cb;
	if(typeof callback === 'function'){
		cb = callback;
	} else {
		cb = function(result){
			var waBB = snap.select('#coordGrid').getBBox();
			_check_fill(result, waBB.w, waBB.h);
//			$('#tmpSvg').remove();
		};
	}
	
	tmpSvg.renderPNG(wMM, hMM, pxPerMM, cb);
};


_check_fill = function(imgDataUrl, w, h){
	var fillImage = snap.image(imgDataUrl, 0, 0, w, h);
	fillImage.attr('id', 'fillRendering');

	snap.select("#userContent").prepend(fillImage);
	
};








