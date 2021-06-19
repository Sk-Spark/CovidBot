// Heart Beat File
// To let Azure App Service we have started

import express from 'express';
import path from 'path';

export const Server = ()=>{
    const app = express();
    const port = process.env.PORT || 3030;

    app.use(express.static( path.join('public') ));    
    
    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`)
    });
}
