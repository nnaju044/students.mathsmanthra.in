import http from "http";

const run = () => {
  const postData = "email=nnaju044@gmail.com&password=123456";

  // Step 1: POST to /login
  const loginOptions = {
    hostname: "localhost",
    port: 8000,
    path: "/login",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = http.request(loginOptions, (res) => {
    console.log("Login Response Status Code:", res.statusCode);
    const cookies = res.headers["set-cookie"];
    console.log("Login Set-Cookie:", cookies);

    if (!cookies) {
      console.log("❌ No cookie set by login!");
      return;
    }

    const sessionCookie = cookies[0].split(";")[0];
    console.log("Using Session Cookie:", sessionCookie);

    // Step 2: GET /dashboard with the cookie
    const dashOptions = {
      hostname: "localhost",
      port: 8000,
      path: "/dashboard",
      method: "GET",
      headers: {
        Cookie: sessionCookie,
      },
    };

    const dashReq = http.request(dashOptions, (dashRes) => {
      console.log("Dashboard Response Status Code:", dashRes.statusCode);
      console.log("Dashboard Headers:", JSON.stringify(dashRes.headers, null, 2));
      
      let data = "";
      dashRes.on("data", (chunk) => {
        data += chunk;
      });
      dashRes.on("end", () => {
        console.log("Dashboard Content Length:", data.length);
        if (data.includes("Maths Manthra")) {
          console.log("✅ Dashboard content contains Maths Manthra");
        } else {
          console.log("❌ Dashboard content does NOT contain Maths Manthra");
        }
      });
    });

    dashReq.on("error", (e) => {
      console.error(`Dashboard request error: ${e.message}`);
    });
    dashReq.end();
  });

  req.on("error", (e) => {
    console.error(`Login request error: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

run();
