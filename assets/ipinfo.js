// if (!navigator.userAgent.match(/bot|spider/i)) {
//     //Let's check if we have the value in sessionStorage
//     if (!sessionStorage.getItem('country')) {
//         $.get("https://ipinfo.io", function(response) {
//             console.log(response.city, response.country);
//             sessionStorage.setItem('country', response.country);
//             const form = document.getElementById('HeaderLocalizationForm');
//             const country_code = response.country;
//             if(country_code == 'NL' || country_code == 'BE') {
//                 form.querySelector('[name="country_code"]').value = 'NL';
//                 form.querySelector('[name="locale_code"]').value = 'nl';
//             } else if (country_code == 'DE' || country_code == 'AT') {
//                 form.querySelector('[name="country_code"]').value = 'DE';
//                 form.querySelector('[name="locale_code"]').value = 'de';
//             } else if (country_code == 'US' || country_code == 'CA') {
//                 form.querySelector('[name="country_code"]').value = 'US';
//                 form.querySelector('[name="locale_code"]').value = 'en';
//             } else {
//                 form.querySelector('[name="country_code"]').value = 'NL';
//                 form.querySelector('[name="locale_code"]').value = 'en';
//             }
//             form.submit();
//         }, "jsonp");
//     }
// }