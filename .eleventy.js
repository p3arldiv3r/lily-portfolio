module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/images");

  eleventyConfig.addFilter("head", function (arr, n) {
    return (arr || []).slice(0, n);
  });

  eleventyConfig.addFilter("date", function (dateValue, format) {
    const d = new Date(dateValue);
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    if (format === "%B %d, %Y") {
      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
    }
    return d.toDateString();
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};
