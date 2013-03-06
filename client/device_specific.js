
function isMobile() {
	return isMobileSafari() || isAndroid();
}

function isMobileSafari() {
  return navigator.userAgent.match(/(iPod|iPhone|iPad)/) && 
	navigator.userAgent.match(/AppleWebKit/)
}

function isAndroid() {
	var ua = navigator.userAgent.toLowerCase();
	return ua.indexOf("android") > -1;
}
