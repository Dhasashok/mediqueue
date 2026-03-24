const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join:department', (departmentId) => {
      socket.join(`dept-${departmentId}`);
      console.log(`Socket ${socket.id} joined dept-${departmentId}`);
    });

    socket.on('join:appointment', (appointmentId) => {
      socket.join(`appt-${appointmentId}`);
    });

    socket.on('join:doctor', (doctorId) => {
      socket.join(`doctor-${doctorId}`);
    });

    socket.on('join:admin', () => {
      socket.join('admin-all');
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;
