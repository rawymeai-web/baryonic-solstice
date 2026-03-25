const asyncFetch = async () => {
    try {
        const res = await fetch("http://localhost:3000/api/catalog");
        const status = res.status;
        const text = await res.text();
        console.log("STATUS:", status);
        console.log("BODY:", text);
    } catch (e) {
        console.error("FETCH FAILED:", e);
    }
};
asyncFetch();
