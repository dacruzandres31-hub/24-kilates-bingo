module.exports = {
    testEnvironment: 'node',
    verbose: true,
    setupFilesAfterEnv: ['./tests/setup.js'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/scripts/**',
        '!src/db.js'
    ],
    coverageDirectory: 'coverage'
};
