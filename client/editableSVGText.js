// This is https://gist.github.com/GerHobbelt/2653660 with a few changes.

// onSetFieldFunction shoul a data param.
function makeEditable(d, field, inputSize, formXOffset, onSetFieldFunction,
	doOnEditStart, doOnEditEnd)
{ 
  this
    .on("mouseover", function() {
      d3.select(this).style("fill", "red");
    })
    .on("mouseout", function() {
      d3.select(this).style("fill", null);
    })
    .on("click", function(d) {
      // console.log("editable", this);

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
				if (!onSetFieldFunctionCalled) {
					onSetFieldFunction(d);
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
			
			var editCancelled = false;
				
      var inp = frm
      .attr("x", parseInt(el.attr('x')) + formXOffset)
      .attr("y", parseInt(el.attr('y')) - parseInt((el.attr('height'))/2))
      .attr("width", el.attr('width'))
      .attr("height", el.attr('height'))
      .append("xhtml:form")
        .append("input")
          .attr("value", function() { return d[field]; })
					.attr("style", "text-align:center;")
          // make the form go away when you jump out (form loses focus) 
					// or hit ENTER:
          .on("blur", function() {
						console.log("blur!");
            var txt = inp.node().value;
            d[field] = txt;
						if (editCancelled) {
							// Reset this flag.
							editCancelled = false;
						}
						else {
							callOnSetFieldFunction(d);
	            el.text(function(d) { return d[field]; });
						}
						removeForm();
						doOnEditEnd();
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
						
						console.log("e.keyCode", e.keyCode);
						if (e.keyCode == 27) { // Esc
							stopEventBubbling(e);
							editCancelled = true;
							console.log("Esc!");
							removeForm();
						}
					})
					.attr("size", inputSize)
					.each(function() { 
						// The text field draws weirdly if we're zoomed in.
						doOnEditStart();
						// It's important to call focus *after* the value is set. This way,
						// the value text gets highlighted.
						this.focus(); 
					});
    });
}
