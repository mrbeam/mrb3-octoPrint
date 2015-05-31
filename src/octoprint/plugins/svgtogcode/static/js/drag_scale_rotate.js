//    Matrix Oven - a snapsvg.io plugin to apply & remove transformations from svg files.
//    Copyright (C) 2015  Teja Philipp <osd@tejaphilipp.de>
//    
//    based on work by https://gist.github.com/timo22345/9413158 
//    and https://github.com/duopixel/Method-Draw/blob/master/editor/src/svgcanvas.js
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
	 * bakes transformations of the element and all sub-elements into coordinates
	 * 
	 * @returns {undefined}
	 */
	Element.prototype.transformable = function () {
		var elem = this;
		if (!elem || !elem.paper) // don't handle unplaced elements. this causes double handling.
			return;

		elem.add_fill();
		// add invisible fill for better dragging.

		
		return elem;

		
	};
	
	Element.prototype.limitDrag = function() {
		var limitBBox = this.paper.select('#scaleGroup').getBBox();
		this.data('minx', limitBBox.x ); this.data('miny', limitBBox.y );
		this.data('maxx', limitBBox.x2 ); this.data('maxy', limitBBox.y2 );
		this.data('x', limitBBox.x );    this.data('y', limitBBox.y );
		this.data('ibb', this.getBBox() );
		this.data('ot', this.transform().local );
		this.drag( _limitMoveDrag, _limitStartDrag );
		return this;    
	};

	// this code is old and clunky now, and transform possibly in wrong order, so only use for simple cases
	function _limitMoveDrag( dx, dy ) {
			var tdx, tdy;
			var sInvMatrix = this.transform().globalMatrix.invert();
			sInvMatrix.e = sInvMatrix.f = 0; 
			tdx = sInvMatrix.x( dx,dy ); tdy = sInvMatrix.y( dx,dy );

			this.data('x', +this.data('ox') + tdx);
			this.data('y', +this.data('oy') + tdy);
			if( this.data('x') > this.data('maxx') - this.data('ibb').width  ) 
					{ this.data('x', this.data('maxx') - this.data('ibb').width  ) };
			if( this.data('y') > this.data('maxy') - this.data('ibb').height ) 
					{ this.data('y', this.data('maxy') - this.data('ibb').height ) };
			if( this.data('x') < this.data('minx') ) { this.data('x', this.data('minx') ) };
			if( this.data('y') < this.data('miny') ) { this.data('y', this.data('miny') ) };
			this.transform( this.data('ot') + "t" + [ this.data('x'), this.data('y') ]  );
	};

	function _limitStartDrag( x, y, ev ) {
			this.data('ox', this.data('x')); this.data('oy', this.data('y'));
	};




	
	/**
	 * Adds transparent fill if not present. 
	 * This is useful for dragging the element around. 
	 * 
	 * @returns {path}
	 */
	Element.prototype.add_fill = function(){
		var elem = this;
		var children = elem.selectAll('*');
		if (children.length > 0) {
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				child.add_fill();
			}
		} else {
			var fill = elem.attr('fill');
			var type = elem.type;
			if(type === 'path' && (fill === 'none' || fill === '')){

				elem.attr({fill: '#ffffff', "fill-opacity": 0});
			}
		}
		return elem;
	};

	



});

