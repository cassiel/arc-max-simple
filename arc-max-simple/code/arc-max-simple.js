var x = new Dict("X");

x.replace("Q::RR", [3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 99]);

x.replace("Q::R[12]", 987);
//x.remove("Q");

x.replace("A[1]", 999);

post(x.get("A[1]") + "\n");

x.parse(JSON.stringify({X: [1, 2, {Y: 4}]}));

post(x.get("X[2]::Y") + "\n");

post(Date() + "\n");
