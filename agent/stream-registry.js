// Simple in-memory stream registry
// This allows sharing MediaStream references between Electron windows
const streams = new Map();

module.exports = {
    setStream(id, stream) {
        streams.set(id, stream);
        console.log(`📹 Stream registered: ${id}`);
    },

    getStream(id) {
        return streams.get(id);
    },

    deleteStream(id) {
        streams.delete(id);
        console.log(`📹 Stream unregistered: ${id}`);
    },

    hasStream(id) {
        return streams.has(id);
    }
};
