source "https://rubygems.org"

# Pinned to the 4.2 series so local preview and CI build with the same Jekyll.
gem "jekyll", "~> 4.2.0"

# Ruby 3.0 dropped webrick from stdlib, so `jekyll serve` needs it as a gem
# there. Ruby 2.7 still ships it, and only 1.6 is installable on 2.7 -- hence
# the floor rather than a pessimistic constraint.
gem "webrick", ">= 1.6"
