// This is https://gist.github.com/GerHobbelt/2653660 with a few changes.

// onSetField should take a data param.
// valid options keys: onSetField, onEditStart, onEditEnd, validate.

function makeEditable(d, field, inputSize, formXOffset, formYOffset, 
	inputClass, options) { 
	
	function addEditFormHierarchy(d) {
    var p = this.parentNode;
 
    // Inject a HTML form to edit the content here. 
    var el = d3.select(this);
    var p_el = d3.select(p);
 
    var frm = p_el.append("foreignObject");
				
		function removeForm() {
			// I don't know why this is an issue since javascript is
			// single-threaded, but without the timeout, there's an exception
			// when hitting enter in the field because both the blur and keypress
			// events call this one after another and one removes it before the 
			// other knows it's gone.
			setTimeout(function () { 
				// console.log("$(frm[0][0])", $(frm[0][0]));
				$(frm[0][0]).remove(); 
			}, 0);
		}
 
	 	var onSetFieldFunctionCalled = false;
		function callOnSetFieldFunction(d) {
			if (!onSetFieldFunctionCalled && options.onSetField) {
				options.onSetField(d);
				onSetFieldFunctionCalled = true;
			}					
		}
			
		function stopEventBubbling(e) {
      if (typeof(e.cancelBubble) !== 'undefined') // IE
        e.cancelBubble = true;
      if (e.stopPropagation)
        e.stopPropagation();
      e.preventDefault();
		}
			
		function exitEditing(d) {				
      var txt = inp.node().value;
			if (editCancelled) {
				// Reset this flag.
				editCancelled = false;
			}
			else {
        d[field] = txt;
				callOnSetFieldFunction(d);
        el.text(function(d) { return d[field]; });
			}
			removeForm();
			
			if (options.onEditEnd) {
				options.onEditEnd();
			}
		  $(document).off('click');
		}
			
		var editCancelled = false;
				
    var inp = frm
    .attr("x", parseInt(el.attr('x')) + formXOffset)
    .attr("y", parseInt(el.attr('y')) + formYOffset)
    .attr("width", el.attr('width'))
    .attr("height", el.attr('height'))
    .append("xhtml:form")
      .append("input")
        .attr("value", function() { return d[field]; })
				.attr("style", "text-align:center;")
        // make the form go away when you jump out (form loses focus) 
				// or hit ENTER:
        .on("blur", function() {
					exitEditing(d);
        })
        .on("keypress", function() {
          // IE fix
          if (!d3.event)
              d3.event = window.event;
 
          var e = d3.event;
          if (e.keyCode == 13) // Enter
          {
						stopEventBubbling(e);
 
            var txt = inp.node().value;
 
            d[field] = txt;
						callOnSetFieldFunction(d);
            el.text(function(d) { return d[field]; });
						// I don't know what I changed to make this select() unable 
						// to catch anything...
            // p_el.select("foreignObject").remove();
						// ...but the code in removeForm() works.
						removeForm();
          }
        })
        .on("keyup", function() {
          // IE fix
          if (!d3.event)
              d3.event = window.event;								 
          var e = d3.event;
						
					if (e.keyCode == 27) { // Esc
						stopEventBubbling(e);
						editCancelled = true;
						removeForm();
					}
				})
				.attr("size", inputSize)
				.each(function(d, i) { 
					// The text field draws weirdly if we're zoomed in.
					if (options.onEditStart) {
						options.onEditStart(d);
					}
					// It's important to call focus *after* the value is set. This way,
					// the value text gets highlighted.
					this.focus();
						
					// Possibly because this is in a <foreignobject>, clicks outside 
					// of the input do not trigger the blur event. So, here's a 
					// click handler that ends editing if there's a click that's not on 
					// the input. However, if it is added without a delay it'll pick up 
					// the initial click that triggered the creation of the form in the 
					// first place and immediately exit editing. So: delay.
					var inputElement = this;
						
					setTimeout(function() { 
						$(document).on('click', function(e) {
							var clickedElement = 
								document.elementFromPoint(e.clientX, e.clientY);
							if (clickedElement !== inputElement) {
								exitEditing(d);
							}
						});
					},
					0);
						
				})
				.classed(inputClass, true);
  }
		
  this
    .on("mouseover", function() {
      d3.select(this).style("fill", "red");
    })
    .on("mouseout", function() {
      d3.select(this).style("fill", null);
    })
    .on("click", addEditFormHierarchy)
		.on("touchend", addEditFormHierarchy);
}
