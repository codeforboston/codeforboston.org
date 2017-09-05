(function(window, document, $, undefined) {

  var $jobs = $('#jobs-listing li');
  // Jobs filtering
  $('#filter-jobs').on('keyup', function(e) {
    var filterText = e.target.value.toLowerCase();

    if (filterText.length) {

      $.each($jobs, function(i, jobEl) {
        var $job = $(jobEl);
        var text = $job.text().toLowerCase();

        if (text.indexOf(filterText) > -1) {
          $job.removeClass('hidden');
        } else {
          $job.addClass('hidden');
        }

      });

    } else {
      $jobs.removeClass('hidden');
    }



  });


})(window, document, $);
