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
	Element.prototype.selectFilled = function(){
		var elem = this;
		var selection = [];
		var children = elem.children();

		
		if (children.length > 0) {
			var goRecursive = (elem.type !== "defs" &&
				elem.type !== "clipPath" &&
				elem.type !== "metadata" &&
				elem.type !== "rdf:rdf" &&
				elem.type !== "cc:work" &&
				elem.type !== "sodipodi:namedview");
		
			if(goRecursive) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					selection = selection.concat(child.selectFilled());
				}
			}
		} else {
			if(elem.is_filled()){
				selection.push(elem);
			}
		}
		return selection;
	};

	Element.prototype.is_filled = function(){
		var elem = this;
		
		// TODO text support
		if (elem.type !== "circle" &&
			elem.type !== "rect" &&
			elem.type !== "ellipse" &&
			elem.type !== "line" &&
			elem.type !== "polygon" &&
			elem.type !== "polyline" &&
			elem.type !== "path"){
			
			return false;
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

});

_renderSvgFills = function (wMM, hMM, resolution) {
	$('#renderCanvas').remove();
	$('#fillSvg').remove();
	snap.selectAll('#fillRendering').remove();
	var wPT = wMM * 90/25.4;
	var hPT = hMM * 90/25.4;
	var fillSvg = Snap(wPT,hPT);
	fillSvg.attr('id', 'fillSvg');
	
	// get filled
	var fillings = snap.select("#userContent").selectFilled();
	for (var i = 0; i < fillings.length; i++) {
		var item = fillings[i];
		var clone = item.clone();
		clone.attr('fill', '#ff0000');
		clone.attr('stroke', 'none');
		fillSvg.append(clone);
	}
	var svgStr = fillSvg.outerSVG();

	// render to canvas
	var svgDataUri = 'data:image/svg+xml;base64,' + window.btoa(svgStr);
	var source = new Image();
	source.src = svgDataUri;

	// get bitmap from canvas
	// Set up our canvas on the page before doing anything.
	var renderCanvas = document.createElement('canvas');
	renderCanvas.id = "renderCanvas";
//	renderCanvas.width = self.workingAreaWidthMM * 10; // 10 px/mm machine resolution. TODO: make configurable
//	renderCanvas.height = self.workingAreaWidthMM * 10;
	renderCanvas.width = wMM * resolution;
	renderCanvas.height = hMM * resolution;
	console.log("created rendercanvas with ", renderCanvas.width, renderCanvas.height);
	var waBB = snap.select('#coordGrid').getBBox();
	document.getElementsByTagName('body')[0].appendChild(renderCanvas);
	var renderCanvasContext = renderCanvas.getContext('2d');

	// Render SVG image to the canvas once it loads.
	source.onload = function () {
		renderCanvasContext.drawImage(source, 0, 0);

		// place fill bitmap into svg
		var fillBitmap = renderCanvas.toDataURL("image/png");
		var fillImage = snap.image(fillBitmap, 0, 0, waBB.w, waBB.h);
		fillImage.attr('id', 'fillRendering');
		//fillImage.attr('preserveAspectRatio', 'true');
		
		snap.select("#userContent").prepend(fillImage);
//		renderCanvas.remove();
//		fillSvg.remove();
	};
};








