document.addEventListener("DOMContentLoaded", function() {
    var btn = document.getElementById('btn-totop');
    var progressBar = document.querySelector('.progress-bar');
    var pathLength = progressBar.getTotalLength();
    progressBar.style.strokeDasharray = pathLength;
    progressBar.style.strokeDashoffset = pathLength;

    window.addEventListener('scroll', function() {
        var scrollPercentage = (document.documentElement.scrollTop + document.body.scrollTop) / (document.documentElement.scrollHeight - document.documentElement.clientHeight);
        var drawLength = pathLength * scrollPercentage;
        progressBar.style.strokeDashoffset = pathLength - drawLength;

        // Optional: Hide/show button based on scroll position
        if (scrollPercentage > 0.1) {
            btn.style.opacity = 1;
            btn.style.pointerEvents = 'auto';
        } else {
            btn.style.opacity = 0;
            btn.style.pointerEvents = 'none';
        }
    });

    // Scroll to top functionality
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});