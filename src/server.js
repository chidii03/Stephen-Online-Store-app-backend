import './db/init.js'; 

const PORT = process.env.PORT || 5000; 

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Steve O Bizz Store Backend running on port ${PORT}`);
});
