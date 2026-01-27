import app from './app.js';
import './db/init.js'; 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Steve O Bizz Store Backend running on port ${PORT}`);
});