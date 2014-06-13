testall: testunit teststyling

teststyling:
	./node_modules/.bin/jsxhint lib/
	./node_modules/.bin/jsxcs lib/

testunit:
	./node_modules/.bin/mocha test
