{
    "version"; 2,
        "builds";[
            {
                "src": "next.config.js",
                "use": "@now/next"
            }
        ],
            "routes";[
                {
                    "src": "/(.*)",
                    "dest": "/$1"
                }
            ]
}