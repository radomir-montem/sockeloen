if (!navigator.userAgent.match(/bot|spider/i)) {
    //Let's check if we have the value in sessionStorage
    if (!sessionStorage.getItem('country')) {
        // No cached data, let's get it from IPinfo
        fetch('https://ipinfo.io/json?token=5be139d763948e')
            .then(res => res.json())
            .then(data => {
                //We have the data, let's cache it in sessionStorage before redirecting
                sessionStorage.setItem('country', data.country);
                const form = document.getElementById('HeaderLocalizationForm');
                const country_code = data.country;
                if(country_code == 'NL' || country_code == 'BE') {
                    form.querySelector('[name="country_code"]').value = 'NL';
                    form.querySelector('[name="locale_code"]').value = 'nl';
                } else if (country_code == 'DE' || country_code == 'AT') {
                    form.querySelector('[name="country_code"]').value = 'DE';
                    form.querySelector('[name="locale_code"]').value = 'de';
                } else if (country_code == 'US' || country_code == 'CA') {
                    form.querySelector('[name="country_code"]').value = 'US';
                    form.querySelector('[name="locale_code"]').value = 'en';
                } else {
                    form.querySelector('[name="country_code"]').value = 'NL';
                    form.querySelector('[name="locale_code"]').value = 'en';
                }
                form.submit();
        })
    }
}