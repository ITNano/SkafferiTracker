# SkafferiTracker
Keeping track of food in your pantry (swe: skafferi).

## Installing dependencies
Note before we start: I am used to Debian (more specifically Raspbian). The instructions below is written from my experience with Raspbian and might differ on other operating systems. For example, RedHat uses yum instead of apt-get. But it shouldn't differ too much.
### Code dependencies
Make sure you have Node and npm installed, for more info see [Node installation page](https://docs.npmjs.com/getting-started/installing-node).
When that is done, use ```npm install``` to setup project dependencies. This process will take around 2-10 minutes.
### Database dependencies
The project uses a MySQL database which needs some "manual" setup.
#### Step 1
First off, install the MySQL server software using 
```
sudo apt-get update && sudo apt-get upgrade
sudo apt-get install mysql-server --fix-missing
```
During the installation process you will be prompted with a root password. This is the account we will use to setup our database. Any account with privileges to use the CREATE DATABASE, CREATE USER and CREATE TABLE privileges would be fine though.

#### Step 2
Once the installation is done, open the file ```db.sql``` from the skafferitracker root directory. On *line 21*, change the part 'REPLACE_THIS_WITH_A_NEW_PASSWORD' to a password of your choice. Then go to file ```skafferi.js``` and use the same password on *line 2*. Note that the user *skafferi* will only have permissions to work on the data of the skafferi database, which makes storing the password in cleartext less horrible.

#### Step 3
When the password has been set, create the db by runnning the following command (make sure to input the root password you selected in Step 1.
```
mysql --user=root --password=your_root_password < db.sql
```

#### Step 4
Be happy! If everything goes as planned, the DB should be setup and ready to use.
## Running the server
To start the server, simply run ``` node index.js ```. This will run on *port 1339*.  
If you want to specify a custom port, use ``` node index.js [portnumber] ```.