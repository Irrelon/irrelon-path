module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleNameMapper: {
		"^@/(.*)$": '<rootDir>/$1'
	},
	collectCoverageFrom: ["src/**/*.ts"],
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100
		}
	}
};
