# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)
require "mobdeals-ui/version"

Gem::Specification.new do |s|
  s.name        = "mobdeals-ui"
  s.version     = Mobdeals::Ui::VERSION
  s.authors     = ["Matthew Moore"]
  s.email       = ["matt@crowdmob.com"]
  s.homepage    = ""
  s.summary     = %q{Common assets for mobdeals apps in a single place}
  s.description = %q{Common assets for mobdeals apps in a single place}

  s.rubyforge_project = "mobdeals-ui"

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ["lib"]

  # specify any dependencies here; for example:
  # s.add_development_dependency "rspec"
  # s.add_runtime_dependency "rest-client"
end
