# Examples
### To install a Node progam:
```
    curl -X POST -H "Content-Type: multipart/form-data" -F "file=@../telegenic_stubs/stub.zip" http://localhost:3001/install
    curl -X POST -H "Content-Type: multipart/form-data" -F "file=@../telegenic_stubs/stub.tar.zip" http://localhost:3001/install
```
  
### To execute a program:
```
    // EXECUTE
    curl -H "Content-Type: application/json" -d '{"event": {"hello":"world"}}' localhost:3001/programs/program_id
    curl -H "Content-Type: application/json" -d '{"event": {"hello":"world"}}' localhost:3001/programs/c6c63160-d868-11ee-8070-733f7c005c83
```    
### Update a program in-place
```
curl -X PUT -H "Content-Type: multipart/form-data" -F "file=@../telegenic_stubs/stub.tar.gz" 
localhost:3001/programs/c6c63160-d868-11ee-8070-733f7c005c83

curl -X PUT -H "Content-Type: multipart/form-data" -F "file=@../telegenic_stubs/stub.zip" 
localhost:3001/programs/c6c63160-d868-11ee-8070-733f7c005c83


```

### Uninstall a program
```
    curl -X DELETE localhost:3001/programs/program_id
    curl -X DELETE localhost:3001/programs/3ee50960-d868-11ee-8070-733f7c005c83
```
